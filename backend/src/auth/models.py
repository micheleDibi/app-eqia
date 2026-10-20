"""Modelli delle tabelle introdotte dalle migrazioni 002, 003 e 004.

CINQUE REGOLE seguite qui, ognuna per un rischio concreto di questo repo:

  1. Nessuna relationship() da o verso Utente. Utente.clienti ha gia'
     cascade="all, delete-orphan" su un mapper fragile; e queste tabelle hanno
     gia' ON DELETE CASCADE nel database, che e' il posto giusto. Si accede
     sempre per utente_id.

  2. Questo modulo importa solo Base da src.database, mai src.utenti.models:
     src/utenti/routers.py importa gia' src/auth, quindi l'import inverso
     creerebbe un ciclo. La ForeignKey e' una stringa risolta a configurazione
     del mapper, e main.py importa tutti i modelli.

  3. I nomi delle colonne FK NON sono uniformi fra le tre tabelle — nelle
     migrazioni e' cosi': `utente_id` senza prefisso in password_reset_token e
     auth_sessione, `prr_utente_id` con prefisso in password_reset_richiesta.

  4. Gli ENUM del database sono mappati come String, non come sqlalchemy.Enum:
     Enum emetterebbe un CHECK su SQLite e un ENUM nativo su MySQL, e si
     disallineerebbe in silenzio il giorno che una migrazione aggiunge un
     valore. I valori ammessi stanno nelle classi Python qui sotto e sono
     verificati contro information_schema da un test.

  5. Le colonne *_created_at sono nullable=False SENZA default Python: si
     valorizzano con func.now(), coerentemente con il DEFAULT CURRENT_TIMESTAMP
     del database e con la regola dell'orologio unico (src/security/tempo.py).
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    text
)
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base

# BIGINT UNSIGNED nel database. Su SQLite un BigInteger non fa autoincrement,
# quindi ogni insert dei test fallirebbe: la variante e' necessaria, non
# cosmetica.
_PK = BigInteger().with_variant(Integer, "sqlite")

# Convenzione legacy Instant Developer, pervasiva nello schema: -1 = TRUE.
ATTIVO = -1
DISATTIVO = 0

# Ruoli che possono accedere e recuperare la password. Non coincide con
# l'elenco Attuatori (filtro solo_attuatori di src/clienti/routers.py), che
# comprende anche l'Operatore (6): questo ruolo compare fra gli attuatori ma
# non accede e non riceve mai la mail di recupero.
# 1 Aderente, 2 Regionale, 3 Provinciale, 5 Nazionale.
from src.auth.ruoli import RUOLI_ACCESSO
RUOLI_ATTUATORE: frozenset[int] = RUOLI_ACCESSO


class Esito(str, Enum):
    """Valori dell'ENUM prr_esito (migrazione 003, piu' 008).

    Non viene mai restituito al client: a video il messaggio e' sempre lo
    stesso, qualunque sia l'esito.
    """

    EMAIL_INVIATA = "email_inviata"
    IDENTIFICATIVO_SCONOSCIUTO = "identificativo_sconosciuto"
    RUOLO_NON_ABILITATO = "ruolo_non_abilitato"
    UTENTE_DISATTIVATO = "utente_disattivato"
    EMAIL_MANCANTE = "email_mancante"
    IDENTIFICATIVO_AMBIGUO = "identificativo_ambiguo"
    RATE_LIMITED_IP = "rate_limited_ip"
    RATE_LIMITED_ACCOUNT = "rate_limited_account"
    ERRORE_INVIO = "errore_invio"
    ERRORE_INTERNO = "errore_interno"  # aggiunto dalla migrazione 008


class MotivoRevoca(str, Enum):
    """Valori dell'ENUM sess_revoked_reason (migrazione 004)."""

    LOGOUT = "logout"
    PASSWORD_RESET = "password_reset"
    PASSWORD_CAMBIATA = "password_cambiata"
    ADMIN = "admin"
    SCADENZA = "scadenza"
    UTENTE_DISATTIVATO = "utente_disattivato"


class MotivoRevocaToken(str, Enum):
    """Valori di prt_revoked_reason (migrazione 002, VARCHAR non ENUM)."""

    NUOVA_RICHIESTA = "nuova_richiesta"
    PASSWORD_CAMBIATA = "password_cambiata"
    ADMIN = "admin"
    PULIZIA = "pulizia"


class PasswordResetToken(Base):
    """Migrazione 002. Il token in chiaro esiste solo dentro il link della
    mail: qui c'e' solo SHA-256(token || PASSWORD_RESET_TOKEN_PEPPER)."""

    __tablename__ = "password_reset_token"

    prt_id: Mapped[int] = mapped_column(_PK, primary_key=True, autoincrement=True)
    utente_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("utenti.utente_id"), nullable=False, index=True
    )
    prt_token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    prt_created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    prt_expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    prt_consumed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    prt_revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    prt_revoked_reason: Mapped[Optional[str]] = mapped_column(String(40))
    prt_request_ip: Mapped[Optional[bytes]] = mapped_column(LargeBinary(16))
    prt_request_ua: Mapped[Optional[str]] = mapped_column(String(255))
    prt_consumed_ip: Mapped[Optional[bytes]] = mapped_column(LargeBinary(16))
    prt_consumed_ua: Mapped[Optional[str]] = mapped_column(String(255))
    # Indirizzo a cui il link e' stato realmente spedito, congelato al momento
    # dell'invio: se il cliente cambia email dopo, l'audit resta leggibile.
    prt_email_inviata: Mapped[Optional[str]] = mapped_column(String(255))


class PasswordResetRichiesta(Base):
    """Migrazione 003: audit e rate limiting. Una riga per OGNI richiesta,
    qualunque sia l'esito."""

    __tablename__ = "password_reset_richiesta"

    prr_id: Mapped[int] = mapped_column(_PK, primary_key=True, autoincrement=True)
    prr_created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    prr_ip: Mapped[bytes] = mapped_column(LargeBinary(16), nullable=False)
    # SHA-256(email normalizzata || pepper): l'indirizzo non si conserva in
    # chiaro, perche' per contare cinque tentativi non serve leggerlo.
    prr_identificativo_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    # NULL quando l'identificativo non corrisponde a nessun account: serve a
    # non ricreare nel log l'oracolo che l'endpoint evita di esporre.
    prr_utente_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("utenti.utente_id")
    )
    prr_esito: Mapped[str] = mapped_column(String(30), nullable=False)
    prr_user_agent: Mapped[Optional[str]] = mapped_column(String(255))


class AuthSessione(Base):
    """Migrazione 004. NON e' `utente_session`, che appartiene alla piattaforma
    legacy Instant Developer ancora in produzione e non va toccata."""

    __tablename__ = "auth_sessione"

    sess_id: Mapped[int] = mapped_column(_PK, primary_key=True, autoincrement=True)
    utente_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("utenti.utente_id"), nullable=False, index=True
    )
    sess_token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    sess_created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    sess_last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    sess_expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    sess_revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    sess_revoked_reason: Mapped[Optional[str]] = mapped_column(String(30))
    sess_ip: Mapped[Optional[bytes]] = mapped_column(LargeBinary(16))
    sess_user_agent: Mapped[Optional[str]] = mapped_column(String(255))


class LogOtp(Base):
    """Riusa la tabella legacy `logs_otp` (script InDe genera/verifica OTP),
    senza alcuna modifica di schema."""

    __tablename__ = "logs_otp"

    log_otp_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cliente_id: Mapped[int] = mapped_column(Integer, ForeignKey("clienti.cliente_id"), nullable=False)
    utente_id: Mapped[int] = mapped_column(Integer, ForeignKey("utenti.utente_id"), nullable=False)
    log_otp_tipo_riferimento: Mapped[str] = mapped_column(String(45), nullable=False)
    log_otp_riferimento: Mapped[str] = mapped_column(String(255), nullable=False)
    log_otp_codice: Mapped[str] = mapped_column(String(45), nullable=False)
    log_otp_check: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    log_otp_datetime_check: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    log_otp_hostname: Mapped[str] = mapped_column(String(45), nullable=False)
    log_otp_created_by: Mapped[int] = mapped_column(Integer, ForeignKey("utenti.utente_id"), nullable=False)
    log_otp_created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=datetime.now)
    log_otp_updated_by: Mapped[int] = mapped_column(Integer, ForeignKey("utenti.utente_id"), nullable=False)
    log_otp_updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, onupdate=text("CURRENT_TIMESTAMP")
    )
    log_otp_expired_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
