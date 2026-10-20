"""Tabella `messaggi_email`, gia' presente nello schema legacy.

I template del recupero password sono inseriti dalla migrazione 006, quelli
per la verifica email/credenziali dalla 011: i testi restano modificabili
senza rideploy come per il resto della piattaforma.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base

CODICE_RESET_RICHIESTA = "password_reset_richiesta"
CODICE_RESET_ESEGUITO = "password_reset_eseguito"
CODICE_OTP_LOGIN_NAZIONALE = "login_otp_nazionale"
CODICE_OTP_VERIFICA_EMAIL = "otp_verifica_email"
CODICE_CREDENZIALI_ACCESSO = "credenziali_accesso"


class MessaggioEmail(Base):
    __tablename__ = "messaggi_email"

    messaggio_email_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    # La UNIQUE su questa colonna e' aggiunta dalla migrazione 006: senza, i
    # codici potrebbero essere duplicati.
    messaggio_email_codice: Mapped[str] = mapped_column(
        String(45), nullable=False, unique=True
    )
    messaggio_email_testo: Mapped[Optional[str]] = mapped_column(Text)
    messaggio_email_oggetto: Mapped[Optional[str]] = mapped_column(String(255))