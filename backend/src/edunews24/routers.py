"""Rotte EduNews24: il browser parla solo con queste, mai con l'API esterna.

Sessione richiesta sul router, nessun controllo di ruolo: i contenuti sono
uguali per tutti. Con la funzione spenta ogni rotta risponde 200 con
`{"attiva": false, "elementi": [], "meta": null}`, che non e' un errore.
Cache-Control: no-store lo mette main.py su tutto il prefisso.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from src.auth.dipendenze import get_current_utente
from src.edunews24.schemi import (
    ElencoBandi,
    ElencoCategorie,
    ElencoNotizie,
    ElencoOpportunita,
    FiltriBandi,
    FiltriInterpelli,
    FiltriNotizie,
    FiltriSelezione,
)
from src.edunews24.servizio import ErroreServizio, get_servizio

router = APIRouter(
    prefix="/edunews24",
    tags=["EduNews24"],
    dependencies=[Depends(get_current_utente)],
)


def _esegui(modello, operazione):
    servizio = get_servizio()
    if not servizio.attiva:
        return modello(attiva=False, elementi=[], meta=None)
    try:
        return operazione(servizio)
    except ErroreServizio as errore:
        raise errore.http() from None


@router.get("/notizie", response_model=ElencoNotizie, summary="Notizie di EduNews24")
def notizie(filtri: Annotated[FiltriNotizie, Query()]):
    return _esegui(ElencoNotizie, lambda servizio: servizio.notizie(filtri))


@router.get("/interpelli", response_model=ElencoOpportunita, summary="Interpelli di EduNews24")
def interpelli(filtri: Annotated[FiltriInterpelli, Query()]):
    return _esegui(ElencoOpportunita, lambda servizio: servizio.interpelli(filtri))


@router.get("/selezione-personale", response_model=ElencoOpportunita,
            summary="Selezione del personale di EduNews24")
def selezione_personale(filtri: Annotated[FiltriSelezione, Query()]):
    return _esegui(ElencoOpportunita, lambda servizio: servizio.selezione(filtri))


@router.get("/bandi", response_model=ElencoBandi, summary="Bandi di EduNews24")
def bandi(filtri: Annotated[FiltriBandi, Query()]):
    return _esegui(ElencoBandi, lambda servizio: servizio.bandi(filtri))


@router.get("/categorie", response_model=ElencoCategorie, summary="Categorie delle notizie di EduNews24")
def categorie():
    return _esegui(ElencoCategorie, lambda servizio: servizio.categorie())
