"""Disponibilita', priorita' e scelta dei metodi del secondo fattore (ADR 0009).

Dopo la password il server PROPONE il metodo migliore che il Nazionale
possiede, in quest'ordine: passkey, authenticator, OTP email. Con "usa un
altro metodo" l'utente sceglie liberamente tra quelli che possiede: la
priorita' decide la proposta, non limita la scelta.

L'OTP email conta come metodo solo se l'email e' verificata (otp_contatti). Un
Nazionale senza alcun metodo riceve al login un codice di verifica dell'email
(`email_accesso`): confermandolo verifica la mail ed entra; dal secondo accesso
il metodo e' l'OTP di login.
"""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import func, select, update

from src.mfa.models import AuthPasskey, AuthTotp
from src.otp.identita import VERIFICA_EMAIL, impronta
from src.otp.invio import genera_e_invia
from src.otp.models import Sfida
from src.otp.servizio import apri_sfida, gia_verificato

PRIORITA = ("passkey", "totp", "email")
MESSAGGIO_SENZA_EMAIL = (
    "Per accedere serve un'email valida in anagrafica: rivolgiti a un amministratore."
)


def metodi_disponibili(db, cliente, utente) -> list[str]:
    """I metodi posseduti, gia' in ordine di priorita'. Vuoto: nessun metodo."""
    metodi = []
    passkey = db.scalar(
        select(func.count()).select_from(AuthPasskey).where(
            AuthPasskey.utente_id == utente.utente_id,
            AuthPasskey.pk_revocato_il.is_(None),
        )
    )
    if passkey:
        metodi.append("passkey")
    totp = db.get(AuthTotp, utente.utente_id)
    if totp is not None and totp.totp_attivato_il is not None and totp.totp_revocato_il is None:
        metodi.append("totp")
    if gia_verificato(db, cliente, "email"):
        metodi.append("email")
    return metodi


def metodo_di(tipo: str) -> str:
    """Il metodo dichiarato al client per una sfida di un dato tipo."""
    return "email" if tipo == "login" else tipo


def sfida_per_metodo(db, contesto, metodo, metodi, richiedente) -> dict:
    """Apre la sfida del metodo e descrive al client il passo successivo.

    `metodo` e' quello in corso, `metodi` quelli tra cui potra' scegliere.
    Per l'email si spedisce il codice (con i limiti d'invio); per i metodi da
    app si apre solo la sfida. Se l'anagrafica non ha un'email valida il
    messaggio dice cosa fare, invece del 422 sul formato.
    """
    if metodo in ("email", VERIFICA_EMAIL):
        tipo = "login" if metodo == "email" else VERIFICA_EMAIL
        try:
            esito = genera_e_invia(db, contesto, tipo, richiedente)
        except HTTPException as errore:
            if errore.status_code == 422:
                raise HTTPException(409, MESSAGGIO_SENZA_EMAIL) from None
            raise
    elif metodo == "totp":
        _, esito = apri_sfida(db, contesto, "totp")
    elif metodo == "passkey":
        from src.mfa.servizio_passkey import opzioni_autenticazione
        _, esito = apri_sfida(db, contesto, "passkey")
        esito["opzioni"] = opzioni_autenticazione(db, contesto[1], esito["sfida"])
    else:
        raise HTTPException(400, "Metodo non disponibile per questo account.")
    return {"requires_2fa": True, "metodo": metodo, "metodi": metodi, **esito}


def avvia_secondo_fattore(db, contesto, richiedente) -> dict:
    """Dopo la password: propone il metodo migliore, o la verifica dell'email."""
    cliente, utente = contesto
    metodi = metodi_disponibili(db, cliente, utente)
    return sfida_per_metodo(db, contesto, metodi[0] if metodi else VERIFICA_EMAIL, metodi, richiedente)


def cambia_metodo(db, contesto, token_corrente, metodo, richiedente) -> dict:
    """"Usa un altro metodo": la sfida in corso decade, se ne apre una del metodo scelto."""
    cliente, utente = contesto
    metodi = metodi_disponibili(db, cliente, utente)
    if metodo not in metodi:
        raise HTTPException(400, "Metodo non disponibile per questo account.")
    db.execute(update(Sfida).where(Sfida.impronta == impronta("sfida:" + token_corrente)).values(stato="superato"))
    db.commit()
    return sfida_per_metodo(db, contesto, metodo, metodi, richiedente)
