from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, LargeBinary, ForeignKey
from src.database import Base
from typing import List, Optional

class Azienda(Base):
    """Centro, dati amministrativi e collegamento al centro superiore."""
    __tablename__ = 'aziende'
    azienda_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    azienda_ragione_sociale: Mapped[str] = mapped_column(String(255), nullable=False)
    azienda_partitaIVA: Mapped[str] = mapped_column(String(255), nullable=False)
    azienda_codiceFiscale: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    azienda_fatturazioneSDI: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    azienda_via: Mapped[str] = mapped_column(String(255), nullable=False)
    azienda_civico: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    azienda_citta: Mapped[str] = mapped_column(String(255), nullable=False)
    azienda_CAP: Mapped[str] = mapped_column(String(45), nullable=False)
    azienda_provincia: Mapped[str] = mapped_column(String(45), nullable=False)
    azienda_sitoWeb: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    azienda_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    azienda_telefono: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    azienda_pec: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    azienda_logo: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable=True)
    azienda_codice_nazionale: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    azienda_iban: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    azienda_codice_bic: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    azienda_padre_id: Mapped[Optional[int]] = mapped_column(ForeignKey('aziende.azienda_id'), nullable=True)
    azienda_created_by: Mapped[Optional[int]] = mapped_column(ForeignKey('utenti.utente_id'), nullable=True)
    padre: Mapped[Optional['Azienda']] = relationship(remote_side=[azienda_id],
        foreign_keys=[azienda_padre_id], lazy='joined', join_depth=1)
    clienti: Mapped[List['Cliente']] = relationship(back_populates='azienda')
