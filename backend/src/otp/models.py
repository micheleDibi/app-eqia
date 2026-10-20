"""Stato OTP autonomo: nessun codice o token di sfida in chiaro nel DB."""
from datetime import datetime
from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from src.database import Base


class Sfida(Base):
    __tablename__ = "otp_sfide"
    impronta: Mapped[str] = mapped_column(String(64), primary_key=True)
    cliente_id: Mapped[int] = mapped_column(Integer)
    utente_id: Mapped[int] = mapped_column(Integer)
    autore_id: Mapped[int] = mapped_column(Integer)
    tipo: Mapped[str] = mapped_column(String(16))
    versione: Mapped[str] = mapped_column(String(64))
    codice: Mapped[str] = mapped_column(String(64))
    stato: Mapped[str] = mapped_column(String(16))
    tentativi: Mapped[int] = mapped_column(Integer, default=0)
    creata: Mapped[datetime] = mapped_column(DateTime)
    scadenza: Mapped[datetime] = mapped_column(DateTime)


class ContattoVerificato(Base):
    __tablename__ = "otp_contatti"
    cliente_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tipo: Mapped[str] = mapped_column(String(16), primary_key=True)
    versione: Mapped[str] = mapped_column(String(64))
    verificato: Mapped[datetime] = mapped_column(DateTime)


class Attivazione(Base):
    __tablename__ = "otp_attivazioni"
    utente_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cliente_id: Mapped[int] = mapped_column(Integer)


class Limite(Base):
    __tablename__ = "otp_limiti"
    chiave: Mapped[str] = mapped_column(String(64), primary_key=True)
    finestra: Mapped[datetime] = mapped_column(DateTime)
    ultimo: Mapped[datetime] = mapped_column(DateTime)
    invii: Mapped[int] = mapped_column(Integer)
