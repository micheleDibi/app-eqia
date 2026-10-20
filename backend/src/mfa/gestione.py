"""Gestione dei propri metodi dal profilo: solo il Nazionale, sempre con sessione.

Attivare, aggiungere e togliere richiedono la password corrente: chi trova un
PC sbloccato non deve poter aggiungere un metodo suo o togliere quello del
titolare. I tentativi sul codice e sulla password passano dai limiti del
login, con chiavi proprie cosi' da non sommarsi a quelli dell'accesso.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.auth.autorizzazioni import richiedi_nazionale
from src.auth.dipendenze import get_current_utente
from src.auth.limiti_login import azzera_account, prenota_tentativo
from src.auth.servizio_login import cliente_principale, verifica_credenziali
from src.database import get_db
from src.mfa import servizio_passkey as passkey
from src.mfa.metodi import metodi_disponibili
from src.mfa.servizio_totp import avvia_attivazione, conferma_attivazione, disattiva, stato_totp
from src.otp.identita import maschera
from src.otp.schemas import RichiestaSfida
from src.otp.servizio import apri_sfida, sfida_app
from src.security.rete import ip_client
from src.utenti.models import Utente

router = APIRouter(prefix="/auth/mfa", tags=["Secondo fattore"], dependencies=[Depends(get_current_utente)])


class ConPassword(BaseModel):
    password: str = Field(max_length=4096)


class ConCodice(BaseModel):
    codice: str = Field(pattern=r"^[0-9]{6}$")


class ConPasswordECodice(ConPassword, ConCodice):
    pass


class ConfermaPasskey(RichiestaSfida):
    credenziale: dict[str, Any]
    nome: str = Field(min_length=1, max_length=80)


class RimozionePasskey(ConPassword):
    id: int = Field(gt=0)


def _cliente_nazionale(db, utente):
    richiedi_nazionale(db, utente, "gestione del secondo fattore")
    return cliente_principale(db, utente.utente_id)


def _conferma_password(db, utente, password, request):
    prenotazione = prenota_tentativo(f"mfa:{utente.utente_username}", ip_client(request))
    if not verifica_credenziali(db, utente, password):
        raise HTTPException(400, "Password non corretta.")
    azzera_account(prenotazione)


def _stato(db, cliente, utente) -> dict:
    metodi = metodi_disponibili(db, cliente, utente)
    email = (cliente.cliente_email or "").strip()
    return {
        "metodi": metodi,
        "proposto": metodi[0] if metodi else None,
        "email": {"verificata": "email" in metodi, "destinatario": maschera(email) if "@" in email else None},
        "totp": stato_totp(db, utente.utente_id),
        "passkey": passkey.elenco(db, utente.utente_id),
    }


@router.get("")
def stato(utente: Utente = Depends(get_current_utente), db: Session = Depends(get_db)):
    return _stato(db, _cliente_nazionale(db, utente), utente)


@router.post("/totp/attiva")
def totp_attiva(corpo: ConPassword, request: Request, utente: Utente = Depends(get_current_utente),
                db: Session = Depends(get_db)):
    _cliente_nazionale(db, utente)
    _conferma_password(db, utente, corpo.password, request)
    return avvia_attivazione(db, utente)


@router.post("/totp/conferma")
def totp_conferma(corpo: ConCodice, request: Request, utente: Utente = Depends(get_current_utente),
                  db: Session = Depends(get_db)):
    _cliente_nazionale(db, utente)
    prenotazione = prenota_tentativo(f"totp:{utente.utente_username}", ip_client(request))
    conferma_attivazione(db, utente, corpo.codice)
    azzera_account(prenotazione)
    return stato_totp(db, utente.utente_id)


@router.post("/totp/disattiva")
def totp_disattiva(corpo: ConPasswordECodice, request: Request, utente: Utente = Depends(get_current_utente),
                   db: Session = Depends(get_db)):
    _cliente_nazionale(db, utente)
    _conferma_password(db, utente, corpo.password, request)
    prenotazione = prenota_tentativo(f"totp:{utente.utente_username}", ip_client(request))
    disattiva(db, utente, corpo.codice)
    azzera_account(prenotazione)
    return stato_totp(db, utente.utente_id)


@router.post("/passkey/opzioni")
def passkey_opzioni(corpo: ConPassword, request: Request, utente: Utente = Depends(get_current_utente),
                    db: Session = Depends(get_db)):
    """Password, poi le opzioni per il browser: la sfida lega la challenge e scade da sola."""
    cliente = _cliente_nazionale(db, utente)
    _conferma_password(db, utente, corpo.password, request)
    _, esito = apri_sfida(db, (cliente, utente), passkey.TIPO_REGISTRAZIONE)
    return {**esito, "opzioni": passkey.opzioni_registrazione(db, cliente, utente, esito["sfida"])}


@router.post("/passkey/conferma")
def passkey_conferma(corpo: ConfermaPasskey, utente: Utente = Depends(get_current_utente),
                     db: Session = Depends(get_db)):
    cliente = _cliente_nazionale(db, utente)
    riga = sfida_app(db, (cliente, utente), corpo.sfida, passkey.TIPO_REGISTRAZIONE)
    passkey.registra(db, utente, corpo.sfida, corpo.credenziale, corpo.nome)
    riga.stato = "consumato"
    db.commit()
    return _stato(db, cliente, utente)


@router.post("/passkey/rimuovi")
def passkey_rimuovi(corpo: RimozionePasskey, request: Request, utente: Utente = Depends(get_current_utente),
                    db: Session = Depends(get_db)):
    cliente = _cliente_nazionale(db, utente)
    _conferma_password(db, utente, corpo.password, request)
    passkey.rimuovi(db, utente, corpo.id)
    return _stato(db, cliente, utente)
