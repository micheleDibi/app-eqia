"""Punto di ingresso del modulo Notizie, da completare nella tranche V3."""
from fastapi import APIRouter, Depends
from src.auth.dipendenze import get_current_utente

router = APIRouter(
    prefix="/notizie", tags=["Notizie"], dependencies=[Depends(get_current_utente)],
)
