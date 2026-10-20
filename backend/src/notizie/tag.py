"""Gestione di sezioni e argomenti delle notizie, solo per il Nazionale: si
aggiungono, si disattivano e si riattivano. Non si rinominano e non si
cancellano: le notizie che li usano li mostrano anche da disattivati. Nel
database le sezioni sono i tag e gli argomenti i sottotag (tag_dettaglio).

Ogni rotta risponde con l'elenco completo, cosi' la finestra si aggiorna
con una sola richiesta.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.auth.models import ATTIVO, DISATTIVO
from src.auth.visibilita import Visibilita, visibilita_corrente
from src.database import get_db
from src.notizie import dati
from src.notizie.scheda import solo_nazionale
from src.notizie.schemi import CategoriaGestione, NomeTag, StatoTag

router = APIRouter()

TAG_INESISTENTE = "Sezione non trovata."
SOTTOTAG_INESISTENTE = "Argomento non trovato."
TAG_DOPPIO = "Esiste già una sezione con questo nome."
SOTTOTAG_DOPPIO = "Questa sezione ha già un argomento con questo nome."


def _elenco(db: Session) -> List[CategoriaGestione]:
    return [CategoriaGestione(**c) for c in dati.categorie(db, anche_disattivati=True)]


@router.get("/tag", response_model=List[CategoriaGestione])
def elenco_tag(db: Session = Depends(get_db), vis: Visibilita = Depends(visibilita_corrente)):
    solo_nazionale(vis)
    return _elenco(db)


@router.post("/tag", response_model=List[CategoriaGestione], status_code=status.HTTP_201_CREATED)
def aggiungi_tag(valori: NomeTag, db: Session = Depends(get_db), vis: Visibilita = Depends(visibilita_corrente)):
    solo_nazionale(vis)
    if dati.nome_tag_usato(db, valori.nome):
        raise HTTPException(status.HTTP_409_CONFLICT, TAG_DOPPIO)
    dati.crea_tag(db, valori.nome)
    db.commit()
    return _elenco(db)


@router.post("/tag/{tag_id}/sottotag", response_model=List[CategoriaGestione], status_code=status.HTTP_201_CREATED)
def aggiungi_sottotag(tag_id: int, valori: NomeTag, db: Session = Depends(get_db),
                      vis: Visibilita = Depends(visibilita_corrente)):
    solo_nazionale(vis)
    if dati.tag(db, tag_id, blocca=True) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, TAG_INESISTENTE)
    if dati.nome_sottotag_usato(db, tag_id, valori.nome):
        raise HTTPException(status.HTTP_409_CONFLICT, SOTTOTAG_DOPPIO)
    dati.crea_sottotag(db, tag_id, valori.nome)
    db.commit()
    return _elenco(db)


@router.put("/tag/{tag_id}/stato", response_model=List[CategoriaGestione])
def stato_tag(tag_id: int, valori: StatoTag, db: Session = Depends(get_db),
              vis: Visibilita = Depends(visibilita_corrente)):
    solo_nazionale(vis)
    if dati.tag(db, tag_id, blocca=True) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, TAG_INESISTENTE)
    dati.imposta_attivo_tag(db, tag_id, ATTIVO if valori.attivo else DISATTIVO)
    db.commit()
    return _elenco(db)


@router.put("/sottotag/{tag_dettaglio_id}/stato", response_model=List[CategoriaGestione])
def stato_sottotag(tag_dettaglio_id: int, valori: StatoTag, db: Session = Depends(get_db),
                   vis: Visibilita = Depends(visibilita_corrente)):
    solo_nazionale(vis)
    if dati.sottotag(db, tag_dettaglio_id, blocca=True) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, SOTTOTAG_INESISTENTE)
    dati.imposta_attivo_sottotag(db, tag_dettaglio_id, ATTIVO if valori.attivo else DISATTIVO)
    db.commit()
    return _elenco(db)
