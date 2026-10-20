"""Login, bootstrap e logout della sessione browser."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from src.auth.ruoli import RUOLI_ACCESSO
from src.auth.dipendenze import get_current_utente
from src.auth.limiti_login import azzera_account, prenota_tentativo
from src.auth.models import MotivoRevoca
from src.auth.schemas import LoginRequest, MESSAGGIO_CREDENZIALI
from src.auth.servizio_login import cliente_principale, codice_ruolo, trova_utente_per_username, verifica_credenziali
from src.database import get_db
from src.security.browser import cancella_cookie, imposta_cookie, token_csrf, token_richiesta, verifica_csrf
from src.security.rete import ip_client, user_agent
from src.security.sessioni import crea_sessione, revoca_sessione, valida_sessione
from src.utenti.models import Utente

router = APIRouter()
logger = logging.getLogger("ersaf.auth")


def _credenziali_errate() -> HTTPException:
    return HTTPException(401, MESSAGGIO_CREDENZIALI)


def _identita_ammessa(db: Session, creds: LoginRequest):
    utente, ambiguo = trova_utente_per_username(db, creds.utente_username)
    if ambiguo:
        logger.warning("accesso negato: username ambiguo")
    if not verifica_credenziali(db, utente, creds.utente_password):
        raise _credenziali_errate()
    cliente = cliente_principale(db, utente.utente_id)
    if cliente is None or cliente.cliente_ruolo not in RUOLI_ACCESSO:
        raise _credenziali_errate()
    return utente, codice_ruolo(db, cliente.cliente_ruolo)


def dati_sessione(utente: Utente, ruolo: str | None, token: str, cliente=None) -> dict:
    # Il segreto di autenticazione non entra nel JSON. Il CSRF non autentica.
    return {
        "utente_id": utente.utente_id,
        "utente_username": utente.utente_username,
        "nome": cliente.cliente_nome if cliente else None,
        "cognome": cliente.cliente_cognome if cliente else None,
        "ruolo_codice": ruolo,
        "csrf_token": token_csrf(token),
    }


def emetti_sessione(db: Session, utente: Utente, ruolo: str | None, request: Request, response: Response) -> dict:
    precedente = token_richiesta(request)
    if precedente:
        revoca_sessione(db, precedente, MotivoRevoca.LOGOUT)
    token, scadenza = crea_sessione(db, utente.utente_id, ip_client(request), user_agent(request))
    db.commit()
    imposta_cookie(response, token)
    cliente = cliente_principale(db, utente.utente_id)
    return {**dati_sessione(utente, ruolo, token, cliente), "scadenza": scadenza.isoformat()}


@router.post("/login")
def login(creds: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    prenotazione = prenota_tentativo(creds.utente_username, ip_client(request))
    utente, ruolo = _identita_ammessa(db, creds)
    if (ruolo or "").lower() == "nazionale":
        # Import locali: src.otp e src.mfa importano emetti_sessione da qui.
        from src.mfa.metodi import avvia_secondo_fattore
        from src.otp.servizio import blocca_cliente
        versione_password = utente.utente_password_hash or utente.utente_password
        cliente = cliente_principale(db, utente.utente_id)
        contesto = blocca_cliente(db, cliente.cliente_id)
        if (contesto[1].utente_attivoSN != -1
                or versione_password != (contesto[1].utente_password_hash or contesto[1].utente_password)
                or (codice_ruolo(db, contesto[0].cliente_ruolo) or "").lower() != "nazionale"):
            raise _credenziali_errate()
        # Il metodo lo propone il server, per priorita' fra quelli posseduti;
        # senza metodi parte la verifica dell'email (ADR 0009).
        risposta = avvia_secondo_fattore(db, contesto, (utente.utente_id, ip_client(request)))
        azzera_account(prenotazione)
        return risposta

    dati = emetti_sessione(db, utente, ruolo, request, response)
    azzera_account(prenotazione)
    logger.info("login riuscito per utente_id=%s", utente.utente_id)
    return dati


@router.get("/session")
def sessione(request: Request, response: Response, utente: Utente = Depends(get_current_utente), db: Session = Depends(get_db)):
    cliente = cliente_principale(db, utente.utente_id)
    ruolo = codice_ruolo(db, cliente.cliente_ruolo) if cliente else None
    response.headers["Cache-Control"] = "no-store"
    return dati_sessione(utente, ruolo, token_richiesta(request), cliente)


@router.post("/logout", status_code=204)
def logout(request: Request, db: Session = Depends(get_db)) -> Response:
    token = token_richiesta(request)
    if token:
        if valida_sessione(db, token):
            verifica_csrf(request, token)
        revoca_sessione(db, token, MotivoRevoca.LOGOUT)
        db.commit()
    response = Response(status_code=204)
    cancella_cookie(response)
    return response
