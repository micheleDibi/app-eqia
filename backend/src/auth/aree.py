"""Verifica centrale del ruolo per tutte le sessioni Equia."""
from fastapi import HTTPException

from .servizio_login import cliente_principale
from .ruoli import RUOLI_ACCESSO


def verifica_ruolo_accesso(db, utente):
    cliente = cliente_principale(db, utente.utente_id)
    if cliente is None or cliente.cliente_ruolo not in RUOLI_ACCESSO:
        raise HTTPException(403, "Non hai i permessi per questa operazione.")
