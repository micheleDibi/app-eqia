"""Scheda di sottoscrittori e attuatori: lettura e salvataggio dei dati della
persona (GET e PUT /clienti/{id}).

- Attuatore e' l'anagrafica con un ruolo di accesso del catalogo,
  sottoscrittore quella con ruolo nullo (docs/contratti-account.md): il tipo
  si ricava dal ruolo, non si salva.
- Si leggono e si salvano solo le anagrafiche visibili (auth/visibilita.py),
  con lo stesso 404 di un id inesistente.
- Ruolo, con le regole del gestionale di origine (Business vale Regionale e
  Provinciale, i due Startup valgono Aderente): lo cambia chi amministra
  account, fra i ruoli che il catalogo gli fa assegnare e solo se puo'
  assegnare anche quello attuale. Un sottoscrittore si promuove ad attuatore
  e un attuatore si riporta a sottoscrittore (ruolo nullo). Nessuno cambia il
  proprio ruolo: si evita di perdere l'ultimo accesso amministrativo.
- "Accedi con questo utente" lo vede solo il Nazionale, come nel gestionale
  di origine, anche se POST /auth/login-as accetta anche Business.
- Codice fiscale, email, PEC, tipo e scadenza del documento si controllano
  solo se cambiati: un dato gia' salvato e non toccato non blocca il resto.
  Lo stesso vale per l'unicita' di codice fiscale, email, telefono,
  cellulare, PEC e numero di documento.
- Nome utente e utente padre li cambia solo il Nazionale, anche sulla propria
  scheda. Il nome utente non puo' essere vuoto ne' uguale a un altro con la
  regola del login; il padre e' un attuatore, non l'utente stesso e non uno
  che gia' ne dipende (il gestionale di origine non controllava i giri).
- Centro (PUT /clienti/{id}/centro, con effetto subito): lo associa, cambia
  o rimuove chi gestisce i centri, solo su un attuatore e solo se vede sia il
  centro attuale sia quello nuovo; chi non e' Nazionale non cambia il
  proprio. Un centro che chi guarda non vede non compare nella scheda.
- Stato dell'account e verifica dei contatti stanno in src/account e src/otp.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.auth.autorizzazioni import ruolo_di
from src.auth.dipendenze import get_current_utente
from src.auth.models import ATTIVO, MotivoRevoca
from src.auth.ruoli import CATALOGO_RUOLI, RUOLI_ACCESSO, RUOLI_AMMINISTRATIVI, RUOLI_ASSEGNABILI
from src.auth.servizio_login import cliente_principale
from src.auth.visibilita import Visibilita, cliente_visibile_o_404, visibilita_corrente
from src.aziende.models import Azienda
from src.aziende.scheda import NON_TROVATO as CENTRO_NON_TROVATO, RUOLI_CENTRI, SENZA_PERMESSI, centro_visibile
from src.clienti.scheda_account import USERNAME_USATO, SOLO_NAZIONALE_ACCOUNT, modifiche_account
from src.clienti.scheda_collegamenti import leggi_collegamenti, modifiche_collegamenti
from src.clienti import validazione
from src.clienti.models import Cliente
from src.clienti.schemi_scheda import (
    AccountScheda,
    CentroScheda,
    ModificheScheda,
    NuovoCentro,
    PadrePossibile,
    PadriPossibili,
    PermessiScheda,
    PersonaCollegata,
    SchedaAnagrafica,
)
from src.clienti.tipi import TipoDocumentoEnum
from src.database import get_db
from src.gestione.contesto import Gestione
from src.gestione.validazione import cellulare
from src.otp.models import Attivazione
from src.otp.servizio import blocca_cliente
from src.security.sessioni import revoca_sessioni_utente
from src.utenti.models import Utente

# Il testo di blocca_cliente per un id inesistente: un'anagrafica non
# visibile riceve la stessa identica risposta.
NON_TROVATA = "Anagrafica non trovata."
RUOLO_NON_ASSEGNABILE = "Non puoi assegnare questo ruolo."
CENTRO_SOLO_ATTUATORI = "Il centro si associa solo agli attuatori."
SOLO_NAZIONALE_CENTRO = "Solo il Nazionale può cambiare il centro della propria anagrafica."
CENTRO_NON_ASSEGNABILE = "Non puoi assegnare questo centro."
LIMITE_PADRI = 50

_CODICI = {r["id"]: r["codice"] for r in CATALOGO_RUOLI}
_COLONNE = [nome for nome in SchedaAnagrafica.model_fields if nome.startswith("cliente_")]
_TIPI_DOCUMENTO = {"", *(tipo.value for tipo in TipoDocumentoEnum)}
_NON_VUOTI = {
    "cliente_nome": "Il nome è obbligatorio.",
    "cliente_cognome": "Il cognome è obbligatorio.",
}
_DATE = {
    "cliente_dataNascita": "La data di nascita è obbligatoria.",
    "cliente_dataRilascio": "La data di rilascio del documento è obbligatoria.",
    "cliente_dataScadenzaDocumento": "La data di scadenza del documento è obbligatoria.",
}
# Valori che due anagrafiche non possono avere uguali, come nel gestionale di
# origine. Il confronto riguarda tutte le anagrafiche, anche quelle che chi
# salva non vede.
_UNICI = {
    "cliente_codice_fiscale": "Esiste già un'anagrafica con questo codice fiscale.",
    "cliente_email": "Esiste già un'anagrafica registrata con questa email.",
    "cliente_telefono": "Esiste già un'anagrafica con questo numero di telefono.",
    "cliente_cellulare": "Esiste già un'anagrafica con questo numero di cellulare.",
    "cliente_pec": "Esiste già un'anagrafica con questa PEC.",
    "cliente_documento": "Esiste già un'anagrafica con questo numero di documento.",
}

router = APIRouter(prefix="/clienti", tags=["Anagrafiche"], dependencies=[Depends(get_current_utente)])


def tipo_di(cliente: Cliente) -> str:
    return "attuatore" if cliente.cliente_ruolo in RUOLI_ACCESSO else "sottoscrittore"


def ruoli_selezionabili(codice_autore: str, autore: Utente, cliente: Cliente) -> list[int | None]:
    """I ruoli che chi guarda puo' scegliere per l'anagrafica, attuale
    compreso; None e' il sottoscrittore. Vuoto se il ruolo e' bloccato."""
    if codice_autore not in RUOLI_AMMINISTRATIVI:
        return []
    if cliente.utente_id == autore.utente_id:
        return []
    assegnabili = RUOLI_ASSEGNABILI.get(codice_autore, frozenset())
    attuale = _CODICI.get(cliente.cliente_ruolo)
    if attuale is not None and attuale not in assegnabili:
        return []
    return [None, *(r["id"] for r in CATALOGO_RUOLI if r["codice"] in assegnabili)]


def puo_accedere(codice_autore: str, autore: Utente, cliente: Cliente, utente: Utente) -> bool:
    """"Accedi con questo utente": il Nazionale, su un attuatore attivo che non
    sia Nazionale (POST /auth/login-as lo rifiuta) ne' se stesso. La
    visibilita' e' gia' quella della scheda."""
    return (codice_autore == "nazionale"
            and cliente.cliente_ruolo in RUOLI_ACCESSO
            and _CODICI[cliente.cliente_ruolo] != "nazionale"
            and utente.utente_attivoSN == ATTIVO
            and utente.utente_id != autore.utente_id)


def _persona(db: Session, utente: Utente | None) -> PersonaCollegata | None:
    if utente is None:
        return None
    riga = cliente_principale(db, utente.utente_id)
    nome = f"{riga.cliente_nome} {riga.cliente_cognome}".strip() if riga else ""
    return PersonaCollegata(utente_id=utente.utente_id, nome=nome or utente.utente_username)


def _attivazione(db: Session, utente: Utente) -> str:
    if db.get(Attivazione, utente.utente_id) is not None:
        return "in_attesa"
    return "attivo" if utente.utente_attivoSN == ATTIVO else "disattivato"


def blocco_centro(db: Session, codice_autore: str, vis: Visibilita, autore: Utente, cliente: Cliente) -> HTTPException | None:
    """Perche' chi guarda non puo' associare, cambiare o rimuovere il centro
    dell'anagrafica, o None se puo'. Il centro nuovo si controlla a parte."""
    if codice_autore not in RUOLI_CENTRI:
        return HTTPException(status.HTTP_403_FORBIDDEN, SENZA_PERMESSI)
    if cliente.cliente_ruolo not in RUOLI_ACCESSO:
        return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, CENTRO_SOLO_ATTUATORI)
    if cliente.utente_id == autore.utente_id and not vis.nazionale:
        return HTTPException(status.HTTP_403_FORBIDDEN, SOLO_NAZIONALE_CENTRO)
    if cliente.azienda_id is not None and not centro_visibile(db, vis, cliente.azienda_id):
        return HTTPException(status.HTTP_403_FORBIDDEN, CENTRO_NON_ASSEGNABILE)
    return None


def _centro(db: Session, vis: Visibilita, codice_autore: str, cliente: Cliente) -> CentroScheda | None:
    azienda = cliente.azienda
    if azienda is None or not centro_visibile(db, vis, azienda.azienda_id):
        return None
    return CentroScheda(
        azienda_id=azienda.azienda_id, ragione_sociale=azienda.azienda_ragione_sociale,
        partita_iva=azienda.azienda_partitaIVA, codice_fiscale=azienda.azienda_codiceFiscale,
        email=azienda.azienda_email, pec=azienda.azienda_pec, telefono=azienda.azienda_telefono,
        citta=azienda.azienda_citta, provincia=azienda.azienda_provincia,
        apribile=codice_autore in RUOLI_CENTRI,
    )


def leggi_scheda(db: Session, vis: Visibilita, autore: Utente, cliente: Cliente, utente: Utente) -> SchedaAnagrafica:
    codice_autore = (ruolo_di(db, autore.utente_id) or "").lower()
    centro = _centro(db, vis, codice_autore, cliente)
    return SchedaAnagrafica(
        **{colonna: getattr(cliente, colonna) for colonna in _COLONNE},
        **leggi_collegamenti(Gestione(db, autore, codice_autore, vis), cliente),
        azienda_id=centro.azienda_id if centro else None,
        tipo=tipo_di(cliente),
        account=AccountScheda(
            utente_id=utente.utente_id, username=utente.utente_username,
            attivazione=_attivazione(db, utente),
            creato_il=utente.utente_created_at, aggiornato_il=utente.utente_updated_at,
            aggiornato_da=_persona(db, utente.aggiornato_da), padre=_persona(db, utente.padre),
        ),
        centro=centro,
        centro_nascosto=cliente.azienda_id is not None and not centro_visibile(db, vis, cliente.azienda_id),
        permessi=PermessiScheda(
            ruoli=ruoli_selezionabili(codice_autore, autore, cliente),
            stato_account=vis.nazionale,
            accedi=puo_accedere(codice_autore, autore, cliente, utente),
            username=vis.nazionale,
            padre=vis.nazionale,
            centro=blocco_centro(db, codice_autore, vis, autore, cliente) is None,
        ),
    )


def _normalizza(colonna: str, valore):
    """Testi senza spazi ai lati; un testo svuotato vale NULL nelle colonne
    che lo ammettono e stringa vuota nelle altre."""
    if isinstance(valore, str):
        valore = valore.strip()
    if colonna in _DATE or colonna == "cliente_ruolo":
        return valore
    if valore in (None, ""):
        return None if Cliente.__table__.c[colonna].nullable else ""
    return valore


def _controlla(db: Session, cliente_id: int, colonna: str, valore, ruoli: list[int | None]):
    """Il valore da salvare per un campo cambiato, o HTTPException."""
    if colonna == "cliente_ruolo":
        if valore not in ruoli:
            raise HTTPException(status.HTTP_403_FORBIDDEN, RUOLO_NON_ASSEGNABILE)
        return valore
    if colonna in _NON_VUOTI and not valore:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, _NON_VUOTI[colonna])
    if colonna in _DATE and valore is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, _DATE[colonna])
    if colonna == "cliente_tipoDocumento" and valore not in _TIPI_DOCUMENTO:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Tipo di documento non valido.")
    try:
        if colonna == "cliente_codice_fiscale" and valore:
            valore = validazione.codice_fiscale(valore)
        if colonna == "cliente_email" and valore:
            valore = validazione.email(valore)
        if colonna == "cliente_pec" and valore:
            valore = validazione.email(valore, "PEC")
        if colonna == "cliente_cellulare" and valore:
            valore = cellulare(valore)
        if colonna == "cliente_dataScadenzaDocumento":
            valore = validazione.scadenza_documento(valore, db.scalar(select(func.curdate())))
    except ValueError as errore:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(errore))
    if colonna in _UNICI and valore:
        altra = db.scalar(select(Cliente.cliente_id).where(
            getattr(Cliente, colonna) == valore, Cliente.cliente_id != cliente_id).limit(1))
        if altra is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, _UNICI[colonna])
    return valore


@router.get("/{cliente_id}", response_model=SchedaAnagrafica)
def leggi(cliente_id: int, db: Session = Depends(get_db),
          vis: Visibilita = Depends(visibilita_corrente), autore: Utente = Depends(get_current_utente)):
    cliente_visibile_o_404(db, vis, cliente_id, NON_TROVATA)
    cliente = db.get(Cliente, cliente_id)
    if cliente is None or cliente.utente is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NON_TROVATA)
    return leggi_scheda(db, vis, autore, cliente, cliente.utente)


@router.put("/{cliente_id}", response_model=SchedaAnagrafica)
def salva(cliente_id: int, modifiche: ModificheScheda, db: Session = Depends(get_db),
          vis: Visibilita = Depends(visibilita_corrente), autore: Utente = Depends(get_current_utente)):
    # Prima del blocco: su un'anagrafica non visibile non succede nulla.
    cliente_visibile_o_404(db, vis, cliente_id, NON_TROVATA)
    cliente, utente = blocca_cliente(db, cliente_id)
    # Sulla riga bloccata: un cambio di ruolo concorrente non passa con i
    # permessi calcolati sul valore vecchio.
    ruoli = ruoli_selezionabili((ruolo_di(db, autore.utente_id) or "").lower(), autore, cliente)
    inviati = modifiche.model_dump(exclude_unset=True)
    collegamenti = modifiche_collegamenti(
        Gestione(db, autore, ruolo_di(db, autore.utente_id), vis), cliente, inviati)
    # Dell'account: rimandare il valore gia' salvato non e' un cambio e passa.
    account = modifiche_account(db, utente, vis, inviati)

    cambiati = {}
    for colonna, valore in inviati.items():
        valore = _normalizza(colonna, valore)
        if valore != getattr(cliente, colonna):
            cambiati[colonna] = _controlla(db, cliente_id, colonna, valore, ruoli)
    if "cliente_ruolo" in cambiati:
        revoca_sessioni_utente(db, utente.utente_id, MotivoRevoca.ADMIN)
    for colonna, valore in (cambiati | collegamenti).items():
        setattr(cliente, colonna, valore)
    for colonna, valore in account.items():
        setattr(utente, colonna, valore)
    if account or cambiati or collegamenti:
        utente.utente_updated_by = autore.utente_id
        utente.utente_updated_at = func.current_timestamp()
    try:
        db.commit()
    except IntegrityError:
        # Due nomi utente uguali salvati insieme: l'indice univoco della
        # migrazione 018 ferma il secondo.
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, USERNAME_USATO)
    return leggi_scheda(db, vis, autore, cliente, utente)


@router.put("/{cliente_id}/centro", response_model=SchedaAnagrafica)
def cambia_centro(cliente_id: int, nuovo: NuovoCentro, db: Session = Depends(get_db),
                  vis: Visibilita = Depends(visibilita_corrente), autore: Utente = Depends(get_current_utente)):
    """Associa, cambia o rimuove (null) il centro di un attuatore, subito e
    non con "Salva modifiche"."""
    cliente_visibile_o_404(db, vis, cliente_id, NON_TROVATA)
    cliente, utente = blocca_cliente(db, cliente_id)
    codice_autore = (ruolo_di(db, autore.utente_id) or "").lower()
    blocco = blocco_centro(db, codice_autore, vis, autore, cliente)
    if blocco is not None:
        raise blocco
    if nuovo.azienda_id != cliente.azienda_id:
        if nuovo.azienda_id is not None:
            if not centro_visibile(db, vis, nuovo.azienda_id):
                raise HTTPException(status.HTTP_403_FORBIDDEN, CENTRO_NON_ASSEGNABILE)
            if db.get(Azienda, nuovo.azienda_id) is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, CENTRO_NON_TROVATO)
        cliente.azienda_id = nuovo.azienda_id
        utente.utente_updated_by = autore.utente_id
        utente.utente_updated_at = func.current_timestamp()
        db.commit()
    return leggi_scheda(db, vis, autore, cliente, utente)


@router.get("/{cliente_id}/padri", response_model=PadriPossibili)
def padri(cliente_id: int, cerca: str = Query("", max_length=100), ruolo: int | None = None,
          dopo: int = Query(0, ge=0), db: Session = Depends(get_db),
          vis: Visibilita = Depends(visibilita_corrente)):
    """Gli attuatori fra cui scegliere il padre (solo il Nazionale): per nome,
    cognome o centro, eventualmente per ruolo, LIMITE_PADRI per volta
    ordinati per cognome e nome. L'utente della scheda non c'e'."""
    if not vis.nazionale:
        raise HTTPException(status.HTTP_403_FORBIDDEN, SOLO_NAZIONALE_ACCOUNT)
    cliente = db.get(Cliente, cliente_id)
    if cliente is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NON_TROVATA)
    query = (select(Cliente.utente_id, Cliente.cliente_id, Cliente.cliente_nome, Cliente.cliente_cognome,
                    Cliente.cliente_ruolo, Azienda.azienda_ragione_sociale.label("centro"))
             .outerjoin(Azienda, Azienda.azienda_id == Cliente.azienda_id)
             .where(Cliente.cliente_ruolo.in_(RUOLI_ACCESSO), Cliente.utente_id != cliente.utente_id))
    if ruolo is not None:
        query = query.where(Cliente.cliente_ruolo == ruolo)
    for parola in cerca.split():
        simile = f"%{parola}%"
        query = query.where(or_(Cliente.cliente_nome.like(simile), Cliente.cliente_cognome.like(simile),
                                Azienda.azienda_ragione_sociale.like(simile)))
    righe = db.execute(query.order_by(Cliente.cliente_cognome, Cliente.cliente_nome, Cliente.cliente_id)
                       .offset(dopo).limit(LIMITE_PADRI + 1)).all()
    return PadriPossibili(voci=[PadrePossibile(**riga._mapping) for riga in righe[:LIMITE_PADRI]],
                          altri=len(righe) > LIMITE_PADRI)
