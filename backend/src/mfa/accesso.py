"""Passo del secondo fattore al login: metodi da app e scelta del metodo.

Nessuna sessione qui: la sfida emessa dopo la password e' la prova del primo
fattore, come per /auth/verifica-otp. La protezione Origin e header e' la
stessa di tutte le scritture.
"""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from src.auth.accesso import emetti_sessione
from src.database import get_db
from src.mfa.metodi import cambia_metodo
from src.mfa.servizio_passkey import autentica
from src.mfa.servizio_totp import verifica_codice_accesso
from src.otp.accesso import contesto_login
from src.otp.schemas import ConfermaSfida, RichiestaSfida
from src.otp.servizio import fallisci_tentativo, sfida_app
from src.security.rete import ip_client

router = APIRouter(prefix="/auth/mfa", tags=["Secondo fattore"])


class CambioMetodo(RichiestaSfida):
    metodo: Literal["email", "totp", "passkey"]


class RispostaPasskey(RichiestaSfida):
    credenziale: dict[str, Any]


def _sfida_di_tipo(db, token: str, atteso: str):
    cliente, utente, tipo = contesto_login(db, token)
    if tipo != atteso:
        raise HTTPException(400, "Verifica non valida. Ripeti l'accesso.")
    return (cliente, utente), sfida_app(db, (cliente, utente), token, atteso)


@router.post("/verifica-totp")
def verifica_totp(corpo: ConfermaSfida, request: Request, response: Response, db: Session = Depends(get_db)):
    (_, utente), riga = _sfida_di_tipo(db, corpo.sfida, "totp")
    if verifica_codice_accesso(db, utente, corpo.codice) is None:
        fallisci_tentativo(db, riga)
    riga.stato = "consumato"
    db.flush()  # commit con la sessione, mai prima
    return emetti_sessione(db, utente, "Nazionale", request, response)


@router.post("/verifica-passkey")
def verifica_passkey(corpo: RispostaPasskey, request: Request, response: Response, db: Session = Depends(get_db)):
    (_, utente), riga = _sfida_di_tipo(db, corpo.sfida, "passkey")
    if autentica(db, utente, corpo.sfida, corpo.credenziale) is None:
        fallisci_tentativo(db, riga)
    riga.stato = "consumato"
    db.flush()
    return emetti_sessione(db, utente, "Nazionale", request, response)


@router.post("/metodo")
def metodo(corpo: CambioMetodo, request: Request, db: Session = Depends(get_db)):
    cliente, utente, _ = contesto_login(db, corpo.sfida)
    return cambia_metodo(db, (cliente, utente), corpo.sfida, corpo.metodo, (utente.utente_id, ip_client(request)))
