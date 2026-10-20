from src.otp.models import ContattoVerificato
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, Date, text, inspect as sa_inspect
from datetime import date
from src.database import Base
from typing import Optional, List
from src.clienti.tipi import SessoEnum, TipoDocumentoEnum

class Cliente(Base):
    __tablename__ = 'clienti'
    cliente_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cliente_codice: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("''"))
    cliente_codice_fiscale: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    cliente_nome: Mapped[str] = mapped_column(String(255), nullable=False, server_default=text("''"))
    cliente_cognome: Mapped[str] = mapped_column(String(255), nullable=False, server_default=text("''"))
    cliente_email: Mapped[str] = mapped_column(String(255), nullable=False, server_default=text("''"))
    cliente_telefono: Mapped[str] = mapped_column(String(255), nullable=False, server_default=text("''"))
    cliente_pec: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cliente_indirizzo: Mapped[str] = mapped_column(String(255), nullable=False, server_default=text("''"))
    cliente_civico: Mapped[str] = mapped_column(String(45), nullable=False, server_default=text("''"))
    cliente_citta: Mapped[str] = mapped_column(String(255), nullable=False, server_default=text("''"))
    cliente_CAP: Mapped[str] = mapped_column(String(10), nullable=False, server_default=text("''"))
    cliente_provincia: Mapped[str] = mapped_column(String(45), nullable=False, server_default=text("''"))
    cliente_cellulare: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    utente_id: Mapped[int] = mapped_column(Integer, ForeignKey('utenti.utente_id'), nullable=False, server_default=text('1'))
    cliente_luogoNascita: Mapped[str] = mapped_column(String(255), nullable=False, server_default=text("''"))
    cliente_provinciaNascita: Mapped[str] = mapped_column(String(45), nullable=False, server_default=text("''"))
    cliente_dataNascita: Mapped[date] = mapped_column(Date, nullable=False, server_default=text("'1999-12-31'"))
    cliente_cittadinanza: Mapped[str] = mapped_column(String(255), nullable=False, server_default=text("''"))
    cliente_tipoDocumento: Mapped[TipoDocumentoEnum] = mapped_column(String(255), nullable=False, server_default=text("''"))
    cliente_documento: Mapped[str] = mapped_column(String(45), nullable=False, server_default=text("''"))
    cliente_comuneRilascio: Mapped[str] = mapped_column(String(255), nullable=False, server_default=text("''"))
    cliente_dataRilascio: Mapped[date] = mapped_column(Date, nullable=False, server_default=text("'1999-12-31'"))
    cliente_dataScadenzaDocumento: Mapped[date] = mapped_column(Date, nullable=False, server_default=text("'1999-12-31'"))
    cliente_sesso: Mapped[SessoEnum] = mapped_column(String(45), nullable=False, server_default=text("''"))
    cliente_indirizzoDomicilio: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cliente_civicoDomicilio: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    cliente_cittaDomicilio: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cliente_CAPDomicilio: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    cliente_provinciaDomicilio: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    cliente_ruolo: Mapped[Optional[int]] = mapped_column(ForeignKey('ruoli.ruolo_id'), nullable=True)
    cliente_gg: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    attuatore_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    azienda_id: Mapped[Optional[int]] = mapped_column(ForeignKey('aziende.azienda_id'), nullable=True)
    tessera_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    utente: Mapped['Utente'] = relationship('Utente', foreign_keys=[utente_id], back_populates='clienti')
    ruolo: Mapped['Ruolo'] = relationship(back_populates='clienti')
    azienda: Mapped[Optional['Azienda']] = relationship(back_populates='clienti')
    verifiche_contatti: Mapped[List[ContattoVerificato]] = relationship(ContattoVerificato, primaryjoin='Cliente.cliente_id == foreign(ContattoVerificato.cliente_id)', viewonly=True, lazy='selectin')

    def _contatto_verificato(self, tipo):
        from src.otp.stato_contatti import stato_contatto
        riga = next((r for r in self.verifiche_contatti if r.tipo == tipo), None)
        attivo = self.utente is not None and self.utente.utente_attivoSN == -1
        return stato_contatto(self, tipo, riga, attivo)['verificato']

    @property
    def email_verificata(self) -> bool:
        return self._contatto_verificato('email')

    @property
    def cellulare_verificato(self) -> bool:
        return self._contatto_verificato('cellulare')
