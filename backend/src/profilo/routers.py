"""Nessun ID fornito dal browser e nessuna operazione di modifica."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.auth.dipendenze import get_current_utente
from src.database import get_db
from src.profilo.schemas import ProfiloPersonale
from src.profilo.servizio import leggi_profilo
from src.utenti.models import Utente

router = APIRouter(prefix="/profilo", tags=["Profilo personale"])


@router.get("/me", response_model=ProfiloPersonale)
def mio_profilo(utente: Utente = Depends(get_current_utente), db: Session = Depends(get_db)):
    return leggi_profilo(db, utente)
