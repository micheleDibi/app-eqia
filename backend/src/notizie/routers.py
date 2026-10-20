"""Le notizie che il Nazionale da' ai centri: elenco, scheda, creazione,
modifica ed eliminazione. Tabelle in dati.py; immagine e allegati in
file.py; sezioni e argomenti in tag.py.

- Il Nazionale vede tutte le notizie e solo lui le scrive.
- Gli altri vedono le notizie di cui sono destinatari: per loro le altre non
  esistono (404).
- I destinatari si scelgono per gruppi (Business, Startup, Startup for
  Education: dati.GRUPPI): alla creazione e a ogni modifica si salvano i
  gruppi spuntati (notizia_gruppo) e gli utenti attivi di quei gruppi, una
  riga per persona. Chi entra in un gruppo dopo non vede la notizia finche'
  non la si salva di nuovo. I Nazionali non sono un gruppo: vedono comunque
  tutte le notizie.
- Aprire la scheda segna la notizia come letta da chi la apre, Nazionale
  compreso (notizia_letta): l'elenco lo dice per ogni notizia (`letta`),
  /da-leggere conta quelle ancora da aprire. Modificarla non la rende di
  nuovo da leggere.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.auth.dipendenze import get_current_utente
from src.auth.visibilita import Visibilita, visibilita_corrente
from src.database import get_db
from src.notizie import dati
from src.notizie.file import router as file_router
from src.notizie.scheda import leggi_scheda, notizia_visibile, solo_nazionale
from src.notizie.schemi import Categoria, DatiNotizia, NotizieDaLeggere, RigaNotizia, SchedaNotizia
from src.notizie.tag import router as tag_router
from src.utenti.models import Utente

CATEGORIA_NON_VALIDA = "Scegli una delle sezioni dell'elenco."
SOTTOTAG_NON_VALIDO = "Scegli gli argomenti fra quelli della sezione."

# Autenticazione a livello di router: una rotta nuova la trova gia' protetta.
router = APIRouter(
    prefix="/notizie",
    tags=["Notizie"],
    dependencies=[Depends(get_current_utente)],
)
router.include_router(file_router)
# Prima di /{notizia_id}: "tag" non e' un id.
router.include_router(tag_router)


class FiltriNotizie(BaseModel):
    skip: int = Field(0, ge=0)
    limit: int = Field(20, ge=1, le=50)
    tag_id: Optional[int] = Field(None, ge=1)
    # Piu' argomenti (tag_dettaglio_id ripetuto): le notizie con almeno uno.
    tag_dettaglio_id: List[Annotated[int, Field(ge=1)]] = Field(default_factory=list, max_length=50)


# Prima di /{notizia_id}: "categorie" non e' un id.
@router.get("/categorie", response_model=List[Categoria])
def elenco_categorie(db: Session = Depends(get_db)):
    return [Categoria(**c) for c in dati.categorie(db)]


# Prima di /{notizia_id}: "da-leggere" non e' un id.
@router.get("/da-leggere", response_model=NotizieDaLeggere)
def notizie_da_leggere(
    response: Response,
    db: Session = Depends(get_db),
    vis: Visibilita = Depends(visibilita_corrente),
    utente: Utente = Depends(get_current_utente),
):
    response.headers["Cache-Control"] = "no-store"
    return NotizieDaLeggere(totale=dati.da_leggere(db, utente.utente_id, vis.nazionale))


@router.get("/", response_model=List[RigaNotizia])
def elenco_notizie(
    filtri: Annotated[FiltriNotizie, Query()],
    response: Response,
    db: Session = Depends(get_db),
    vis: Visibilita = Depends(visibilita_corrente),
    utente: Utente = Depends(get_current_utente),
):
    response.headers["Cache-Control"] = "no-store"
    righe = dati.elenco(db, utente.utente_id, vis.nazionale, filtri.skip, filtri.limit,
                        tag_id=filtri.tag_id, tag_dettaglio_id=filtri.tag_dettaglio_id)
    return [RigaNotizia(**r) for r in righe]


@router.get("/{notizia_id}", response_model=SchedaNotizia)
def scheda_notizia(
    notizia_id: int,
    response: Response,
    db: Session = Depends(get_db),
    vis: Visibilita = Depends(visibilita_corrente),
    utente: Utente = Depends(get_current_utente),
):
    riga = notizia_visibile(db, vis, utente, notizia_id)
    dati.segna_letta(db, notizia_id, utente.utente_id, datetime.now())
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    return leggi_scheda(db, vis, riga)


def _controlla_tag(db: Session, valori: DatiNotizia, attuale: Optional[dict] = None) -> None:
    """La sezione fra quelle attive, gli argomenti fra quelli attivi della
    sezione. Modificando una notizia restano ammessi anche la sua sezione e i
    suoi argomenti di prima, se nel frattempo sono stati disattivati."""
    attivi = {c["tag_id"]: {s["tag_dettaglio_id"] for s in c["sottotag"]} for c in dati.categorie(db)}
    if valori.tag_id not in attivi and not (attuale and attuale["tag_id"] == valori.tag_id):
        raise HTTPException(422, CATEGORIA_NON_VALIDA)
    ammessi = set(attivi.get(valori.tag_id, set()))
    if attuale:
        for gia in dati.sottotag_delle_notizie(db, [attuale["notizia_id"]]).get(attuale["notizia_id"], []):
            riga = dati.sottotag(db, gia["tag_dettaglio_id"])
            if riga and riga["tag_id"] == valori.tag_id:
                ammessi.add(gia["tag_dettaglio_id"])
    if any(d not in ammessi for d in valori.sottotag):
        raise HTTPException(422, SOTTOTAG_NON_VALIDO)


@router.post("/", response_model=SchedaNotizia, status_code=status.HTTP_201_CREATED)
def crea_notizia(
    valori: DatiNotizia,
    db: Session = Depends(get_db),
    vis: Visibilita = Depends(visibilita_corrente),
    utente: Utente = Depends(get_current_utente),
):
    solo_nazionale(vis)
    _controlla_tag(db, valori)
    adesso = datetime.now()
    notizia_id = dati.crea(db, valori.model_dump(), utente.utente_id, adesso)
    dati.allinea_destinatari(db, notizia_id, dati.destinatari_dei_gruppi(db, valori.gruppi), adesso)
    dati.allinea_gruppi(db, notizia_id, valori.gruppi)
    dati.allinea_sottotag(db, notizia_id, valori.sottotag)
    db.commit()
    return leggi_scheda(db, vis, dati.notizia(db, notizia_id))


@router.put("/{notizia_id}", response_model=SchedaNotizia)
def modifica_notizia(
    notizia_id: int,
    valori: DatiNotizia,
    db: Session = Depends(get_db),
    vis: Visibilita = Depends(visibilita_corrente),
    utente: Utente = Depends(get_current_utente),
):
    solo_nazionale(vis)
    attuale = notizia_visibile(db, vis, utente, notizia_id, blocca=True)
    _controlla_tag(db, valori, attuale)
    adesso = datetime.now()
    dati.modifica(db, notizia_id, valori.model_dump(), utente.utente_id, adesso)
    # I gruppi si salvano e i destinatari si ricalcolano: entrano gli
    # utenti arrivati dopo, escono quelli disattivati.
    dati.allinea_destinatari(db, notizia_id, dati.destinatari_dei_gruppi(db, valori.gruppi), adesso)
    dati.allinea_gruppi(db, notizia_id, valori.gruppi)
    dati.allinea_sottotag(db, notizia_id, valori.sottotag)
    db.commit()
    return leggi_scheda(db, vis, dati.notizia(db, notizia_id))


@router.delete("/{notizia_id}", status_code=status.HTTP_204_NO_CONTENT)
def elimina_notizia(
    notizia_id: int,
    db: Session = Depends(get_db),
    vis: Visibilita = Depends(visibilita_corrente),
    utente: Utente = Depends(get_current_utente),
):
    solo_nazionale(vis)
    notizia_visibile(db, vis, utente, notizia_id, blocca=True)
    dati.elimina(db, notizia_id)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
