"""Chi vede una notizia e com'e' fatta la sua scheda, per routers.py e file.py."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.auth.visibilita import Visibilita
from src.notizie import dati
from src.notizie.schemi import AllegatoNotizia, SchedaNotizia, Sottotag
from src.utenti.models import Utente

NON_TROVATA = "Notizia non trovata."
SOLO_NAZIONALE = "Solo il Nazionale può modificare le notizie."


def solo_nazionale(vis: Visibilita) -> None:
    if not vis.nazionale:
        raise HTTPException(status.HTTP_403_FORBIDDEN, SOLO_NAZIONALE)


def notizia_visibile(db: Session, vis: Visibilita, utente: Utente, notizia_id: int, *,
                     blocca: bool = False) -> dict:
    """La riga della notizia, se l'utente la vede: il Nazionale tutte, gli
    altri quelle di cui sono destinatari. Altrimenti 404, come per una
    notizia che non c'e'."""
    riga = dati.notizia(db, notizia_id, blocca=blocca)
    if riga is None or not (vis.nazionale or dati.destinatario(db, notizia_id, utente.utente_id)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, NON_TROVATA)
    return riga


def leggi_scheda(db: Session, vis: Visibilita, riga: dict) -> SchedaNotizia:
    notizia_id = riga["notizia_id"]
    sottotag = dati.sottotag_delle_notizie(db, [notizia_id]).get(notizia_id, [])
    return SchedaNotizia(
        **{**riga, "sottotag": [Sottotag(**s) for s in sottotag]},
        allegati=[AllegatoNotizia(**a) for a in dati.allegati(db, notizia_id)],
        modificabile=vis.nazionale,
        gruppi=dati.gruppi(db, notizia_id) if vis.nazionale else [],
        destinatari=dati.numero_destinatari(db, notizia_id) if vis.nazionale else None,
    )
