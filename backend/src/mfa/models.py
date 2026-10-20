"""Modelli della migrazione 015: i metodi del secondo fattore del Nazionale.

Stesse regole di src/auth/models.py: nessuna relationship verso Utente, la
ForeignKey e' una stringa, le colonne temporali si valorizzano dal database.
Le sfide non stanno qui: restano in otp_sfide (src/otp/models.py) con i tipi
`login`, `email_accesso`, `totp` e `passkey`.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base

_PK = BigInteger().with_variant(Integer, "sqlite")


class AuthTotp(Base):
    """Un solo authenticator per utente: attivo quando totp_attivato_il e'
    valorizzato e totp_revocato_il no. Il segreto e' cifrato (AES-GCM)."""

    __tablename__ = "auth_totp"

    utente_id: Mapped[int] = mapped_column(Integer, ForeignKey("utenti.utente_id"), primary_key=True)
    totp_segreto: Mapped[bytes] = mapped_column(LargeBinary(96), nullable=False)
    totp_attivato_il: Mapped[Optional[datetime]] = mapped_column(DateTime)
    # Ultimo passo temporale accettato: un codice vale una volta sola.
    totp_ultimo_passo: Mapped[Optional[int]] = mapped_column(BigInteger)
    totp_creato_il: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    totp_revocato_il: Mapped[Optional[datetime]] = mapped_column(DateTime)
    totp_revocato_motivo: Mapped[Optional[str]] = mapped_column(String(30))


class AuthPasskey(Base):
    """Credenziale WebAuthn: solo la chiave pubblica, mai materiale segreto."""

    __tablename__ = "auth_passkey"

    pk_id: Mapped[int] = mapped_column(_PK, primary_key=True, autoincrement=True)
    utente_id: Mapped[int] = mapped_column(Integer, ForeignKey("utenti.utente_id"), nullable=False, index=True)
    pk_credential_id: Mapped[bytes] = mapped_column(LargeBinary(1024), nullable=False, unique=True)
    pk_chiave_pubblica: Mapped[bytes] = mapped_column(LargeBinary(1024), nullable=False)
    pk_sign_count: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    pk_aaguid: Mapped[Optional[bytes]] = mapped_column(LargeBinary(16))
    pk_trasporti: Mapped[Optional[str]] = mapped_column(String(100))
    pk_backup_eligible: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pk_backed_up: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pk_nome: Mapped[str] = mapped_column(String(80), nullable=False)
    pk_creato_il: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    pk_ultimo_uso: Mapped[Optional[datetime]] = mapped_column(DateTime)
    pk_revocato_il: Mapped[Optional[datetime]] = mapped_column(DateTime)


class AuthMfaUtente(Base):
    """Handle WebAuthn dell'utente: 32 byte casuali, stabili, mai lo username."""

    __tablename__ = "auth_mfa_utente"

    utente_id: Mapped[int] = mapped_column(Integer, ForeignKey("utenti.utente_id"), primary_key=True)
    mfa_user_handle: Mapped[bytes] = mapped_column(LargeBinary(32), nullable=False, unique=True)
    mfa_creato_il: Mapped[datetime] = mapped_column(DateTime, nullable=False)
