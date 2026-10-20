"""Come i messaggi escono dall'applicazione.

Quattro implementazioni dello stesso protocollo, scelte da EMAIL_BACKEND:
  smtp     invio reale (obbligatorio in produzione, lo impone la verifica di
           avvio)
  file     scrive un .eml, per lo sviluppo
  console  stampa le sole intestazioni
  memoria  tiene i messaggi in una lista, per i test

Le credenziali arrivano da .env. La tabella `mail` del database, che contiene
host, porta e password in chiaro della casella di invio, NON viene letta: e'
un'impostazione della piattaforma legacy.
"""

from __future__ import annotations

import logging
import secrets
import smtplib
import ssl
from datetime import datetime
from email.message import EmailMessage
from typing import Protocol

from src.config import get_impostazioni

logger = logging.getLogger("ersaf.email")


class Mailer(Protocol):
    def invia(self, messaggio: EmailMessage) -> None: ...


class BackendSMTP:
    def invia(self, messaggio: EmailMessage) -> None:
        impostazioni = get_impostazioni()
        # Il timeout NON e' facoltativo: senza, smtplib eredita il default
        # globale del socket, cioe' nessuno, e un server che accetta la
        # connessione senza rispondere terrebbe occupato per sempre uno dei 40
        # thread del pool condiviso da tutta l'applicazione.
        timeout = impostazioni.smtp_timeout_seconds
        if impostazioni.smtp_tls == "ssl":
            contesto = ssl.create_default_context()
            with smtplib.SMTP_SSL(
                impostazioni.smtp_host,
                impostazioni.smtp_port,
                timeout=timeout,
                context=contesto,
            ) as smtp:
                self._autentica_e_invia(smtp, messaggio, impostazioni)
        else:
            with smtplib.SMTP(
                impostazioni.smtp_host, impostazioni.smtp_port, timeout=timeout
            ) as smtp:
                if impostazioni.smtp_tls == "starttls":
                    smtp.starttls(context=ssl.create_default_context())
                self._autentica_e_invia(smtp, messaggio, impostazioni)

    @staticmethod
    def _autentica_e_invia(smtp, messaggio: EmailMessage, impostazioni) -> None:
        if impostazioni.smtp_user:
            smtp.login(impostazioni.smtp_user, impostazioni.smtp_password)
        smtp.send_message(messaggio)


class BackendFile:
    """Scrive il messaggio completo in EMAIL_FILE_DIR.

    Deliberatamente NON dentro backend/logs/: in sviluppo il link di reset
    contiene il token e deve restare leggibile allo sviluppatore, mentre i log
    non devono contenere valori sensibili. Sul log finisce il percorso del
    file, mai il contenuto.
    """

    def invia(self, messaggio: EmailMessage) -> None:
        cartella = get_impostazioni().dir_email_file
        cartella.mkdir(parents=True, exist_ok=True)
        nome = f"{datetime.now():%Y%m%d-%H%M%S}-{secrets.token_hex(4)}.eml"
        (cartella / nome).write_bytes(messaggio.as_bytes())
        logger.info("email di sviluppo salvata in %s", cartella / nome)


class BackendConsole:
    """Solo le intestazioni: il corpo passerebbe dal filtro di redazione e ne
    uscirebbe inutilizzabile. In sviluppo conviene EMAIL_BACKEND=file."""

    def invia(self, messaggio: EmailMessage) -> None:
        logger.info(
            "email (console) da=%s a=%s oggetto=%s",
            messaggio["From"],
            messaggio["To"],
            messaggio["Subject"],
        )


class BackendMemoria:
    """Per i test: raccoglie i messaggi e sa simulare un guasto."""

    def __init__(self) -> None:
        self.inviate: list[EmailMessage] = []
        self.errore: Exception | None = None

    def invia(self, messaggio: EmailMessage) -> None:
        if self.errore is not None:
            raise self.errore
        self.inviate.append(messaggio)

    def svuota(self) -> None:
        self.inviate.clear()
        self.errore = None


_memoria = BackendMemoria()


def backend_memoria() -> BackendMemoria:
    """L'unica istanza usata quando EMAIL_BACKEND=memoria."""
    return _memoria


def get_mailer() -> Mailer:
    """Dipendenza FastAPI.

    Il mailer risolto entra nella chiusura del task di background, quindi un
    override nei test lo intercetta anche quando l'esecuzione e' differita.
    """
    scelta = get_impostazioni().email_backend
    if scelta == "smtp":
        return BackendSMTP()
    if scelta == "file":
        return BackendFile()
    if scelta == "console":
        return BackendConsole()
    return _memoria
