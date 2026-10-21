"""Scheda di un centro: lettura e salvataggio dei suoi dati (GET e PUT
/aziende/{id}), con gli attuatori collegati, e ricerca per partita IVA del
centro da associare a un attuatore.

- La apre chi ha la voce Centri nel catalogo dei ruoli (Nazionale e
  Business); gli altri ricevono 403.
- Visibilita': la stessa rete dell'elenco, compresi i centri creati e i
  sottocentri (aziende/visibilita.py). Un centro non visibile
  risponde come uno inesistente, anche alla ricerca per partita IVA.
- Dati anagrafici (ragione sociale, partita IVA, codice fiscale, codice SDI):
  li cambia solo il Nazionale. Il codice nazionale non lo cambia nessuno.
- Come per la scheda della persona (clienti/scheda.py) un campo si controlla
  solo se cambia; un valore gia' usato da un altro centro si rifiuta.
- Attuatori: quelli del centro che chi guarda puo' aprire. La loro
  visibilita' segue la catena degli utenti, non il centro.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.auth.autorizzazioni import ruolo_di
from src.auth.dipendenze import get_current_utente
from src.auth.ruoli import CATALOGO_RUOLI, RUOLI_ACCESSO
from src.auth.visibilita import Visibilita, sottoquery_clienti, visibilita_corrente
from src.aziende.models import Azienda
from src.aziende.schemi_scheda import AttuatoreCentro, CentroTrovato, ModificheCentro, PermessiCentro, SchedaCentro
from src.aziende.servizio import verifica_gerarchia
from src.aziende.visibilita import centro_visibile, ids_centri_visibili
from src.clienti import validazione
from src.clienti.models import Cliente
from src.database import get_db
from src.gestione.contesto import Gestione, richiedi
from src.utenti.models import Utente

NON_TROVATO = "Centro non trovato."
SENZA_PERMESSI = "Non hai i permessi per questa operazione."
SOLO_NAZIONALE = "Solo il Nazionale può modificare i dati anagrafici del centro."
PIVA_NON_CONFORME = "La partita IVA deve essere di 11 cifre."
PIVA_NON_TROVATA = "Nessun centro trovato con questa partita IVA."

RUOLI_CENTRI = frozenset(r["codice"] for r in CATALOGO_RUOLI if "aziende" in r["menu"])
CAMPI_ANAGRAFICI = frozenset({
    "azienda_ragione_sociale", "azienda_partitaIVA", "azienda_codiceFiscale", "azienda_fatturazioneSDI",
})
_COLONNE = [nome for nome in SchedaCentro.model_fields if nome.startswith("azienda_")]
_OBBLIGATORI = {
    "azienda_ragione_sociale": "La ragione sociale è obbligatoria.",
    "azienda_partitaIVA": "La partita IVA è obbligatoria.",
    "azienda_codiceFiscale": "Il codice fiscale è obbligatorio.",
    "azienda_via": "La via è obbligatoria.",
    "azienda_citta": "La città è obbligatoria.",
    "azienda_CAP": "Il CAP è obbligatorio.",
    "azienda_provincia": "La provincia è obbligatoria.",
}
# Valori che due centri non possono avere uguali, come nel gestionale di
# origine. Il confronto riguarda tutti i centri, anche quelli non visibili.
_UNICI = {
    "azienda_ragione_sociale": "questa ragione sociale",
    "azienda_partitaIVA": "questa partita IVA",
    "azienda_codiceFiscale": "questo codice fiscale",
    "azienda_email": "questa email",
    "azienda_pec": "questa PEC",
    "azienda_telefono": "questo telefono",
    "azienda_iban": "questo IBAN",
}

router = APIRouter(prefix="/aziende", tags=["Centri"], dependencies=[Depends(get_current_utente)])


def gestisce_centri(db: Session, utente: Utente) -> bool:
    return (ruolo_di(db, utente.utente_id) or "").lower() in RUOLI_CENTRI


def partita_iva_conforme(valore: str) -> bool:
    return valore.isdigit() and len(valore) == 11


def _centro_o_errore(db: Session, vis: Visibilita, autore: Utente, azienda_id: int, *,
                     blocca: bool = False) -> Azienda:
    if not gestisce_centri(db, autore):
        raise HTTPException(status.HTTP_403_FORBIDDEN, SENZA_PERMESSI)
    azienda = None
    if centro_visibile(db, vis, azienda_id):
        query = select(Azienda).where(Azienda.azienda_id == azienda_id)
        if blocca:
            query = query.with_for_update().execution_options(populate_existing=True)
        azienda = db.scalar(query)
    if azienda is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NON_TROVATO)
    return azienda


def _attuatori(db: Session, vis: Visibilita, azienda_id: int) -> list[AttuatoreCentro]:
    query = (select(Cliente.cliente_id, Cliente.cliente_nome, Cliente.cliente_cognome, Cliente.cliente_ruolo)
             .where(Cliente.azienda_id == azienda_id, Cliente.cliente_ruolo.in_(RUOLI_ACCESSO)))
    visibili = sottoquery_clienti(vis)
    if visibili is not None:
        query = query.where(Cliente.cliente_id.in_(visibili))
    righe = db.execute(query.order_by(Cliente.cliente_cognome, Cliente.cliente_nome, Cliente.cliente_id))
    return [AttuatoreCentro(**riga._mapping) for riga in righe]


def leggi_scheda(db: Session, vis: Visibilita, azienda: Azienda) -> SchedaCentro:
    padre = azienda.padre
    padre_visibile = padre and centro_visibile(db, vis, padre.azienda_id)
    return SchedaCentro(
        **{colonna: getattr(azienda, colonna) for colonna in _COLONNE},
        padre_nome=padre.azienda_ragione_sociale if padre_visibile else None,
        attuatori=_attuatori(db, vis, azienda.azienda_id),
        permessi=PermessiCentro(anagrafici=vis.nazionale, gerarchia=vis.nazionale),
    )


def _normalizza(colonna: str, valore):
    """Testi senza spazi ai lati; un testo svuotato vale NULL nelle colonne
    che lo ammettono e stringa vuota nelle altre."""
    valore = (valore or "").strip()
    if colonna == "azienda_provincia":
        valore = valore.upper()
    if valore == "" and Azienda.__table__.c[colonna].nullable:
        return None
    return valore


def _controlla(db: Session, vis: Visibilita, azienda_id: int, colonna: str, valore):
    """Il valore da salvare per un campo cambiato, o HTTPException."""
    if colonna in CAMPI_ANAGRAFICI and not vis.nazionale:
        raise HTTPException(status.HTTP_403_FORBIDDEN, SOLO_NAZIONALE)
    if colonna in _OBBLIGATORI and not valore:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, _OBBLIGATORI[colonna])
    if colonna == "azienda_partitaIVA" and not partita_iva_conforme(valore):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, PIVA_NON_CONFORME)
    try:
        if colonna == "azienda_email" and valore:
            valore = validazione.email(valore)
        if colonna == "azienda_pec" and valore:
            valore = validazione.email(valore, "PEC")
    except ValueError as errore:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(errore))
    if colonna in _UNICI and valore:
        altro = db.scalar(select(Azienda.azienda_id).where(
            getattr(Azienda, colonna) == valore, Azienda.azienda_id != azienda_id).limit(1))
        if altro is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, f"Esiste già un centro con {_UNICI[colonna]}.")
    return valore


@router.get("/partita-iva/{partita_iva}", response_model=CentroTrovato)
def cerca_per_partita_iva(partita_iva: str, db: Session = Depends(get_db),
                          vis: Visibilita = Depends(visibilita_corrente),
                          autore: Utente = Depends(get_current_utente)):
    """Il centro visibile con questa partita IVA. Due centri con la stessa
    partita IVA sono possibili solo fra i dati gia' salvati: vince il primo
    inserito fra quelli visibili."""
    if not gestisce_centri(db, autore):
        raise HTTPException(status.HTTP_403_FORBIDDEN, SENZA_PERMESSI)
    if not partita_iva_conforme(partita_iva):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, PIVA_NON_CONFORME)
    righe = db.execute(select(Azienda.azienda_id, Azienda.azienda_ragione_sociale)
                       .where(Azienda.azienda_partitaIVA == partita_iva).order_by(Azienda.azienda_id))
    visibili = ids_centri_visibili(db, vis)
    trovato = next((riga for riga in righe if visibili is None or riga.azienda_id in visibili), None)
    if trovato is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, PIVA_NON_TROVATA)
    return CentroTrovato(**trovato._mapping)


@router.get("/{azienda_id}", response_model=SchedaCentro)
def leggi(azienda_id: int, db: Session = Depends(get_db),
          vis: Visibilita = Depends(visibilita_corrente), autore: Utente = Depends(get_current_utente)):
    return leggi_scheda(db, vis, _centro_o_errore(db, vis, autore, azienda_id))


@router.put("/{azienda_id}", response_model=SchedaCentro)
def salva(azienda_id: int, modifiche: ModificheCentro, db: Session = Depends(get_db),
          vis: Visibilita = Depends(visibilita_corrente), autore: Utente = Depends(get_current_utente)):
    azienda = _centro_o_errore(db, vis, autore, azienda_id, blocca=True)
    inviati = modifiche.model_dump(exclude_unset=True)
    if "azienda_padre_id" in inviati:
        padre = inviati.pop("azienda_padre_id")
        if padre != azienda.azienda_padre_id:
            richiedi(vis.nazionale)
            verifica_gerarchia(Gestione(db, autore, ruolo_di(db, autore.utente_id), vis), azienda_id, padre)
            azienda.azienda_padre_id = padre
    cambiati = {}
    for colonna, valore in inviati.items():
        valore = _normalizza(colonna, valore)
        if valore != getattr(azienda, colonna):
            cambiati[colonna] = _controlla(db, vis, azienda_id, colonna, valore)
    for colonna, valore in cambiati.items():
        setattr(azienda, colonna, valore)
    db.commit()
    return leggi_scheda(db, vis, azienda)
