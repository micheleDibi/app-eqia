from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, LargeBinary, ForeignKey
from src.database import Base
from typing import List, Optional

class Azienda(Base):
    """Le 206 aziende della piattaforma legacy.

    Le colonne rispecchiano la DDL reale (`SHOW CREATE TABLE aziende`), non
    quella che il modello dichiarava prima. Le differenze non erano teoriche:
    tre `unique=True` su colonne che nel database non hanno alcuna UNIQUE e che
    contengono gia' duplicati (4 gruppi su ragione sociale, 7 su partita IVA,
    7 su codice fiscale), una partita IVA dichiarata nullable ma NOT NULL, un
    codice nazionale dichiarato obbligatorio ma NULL su tutte e 205 le righe, e
    un longblob mappato come String.
    """
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
    clienti: Mapped[List['Cliente']] = relationship(back_populates='azienda')
