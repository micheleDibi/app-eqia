from sqlalchemy import Integer, String, Date, text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date, datetime
from src.database import Base
from src.clienti.models import Cliente
from typing import Optional
import uuid
from typing import List

class Utente(Base):
    __tablename__ = 'utenti'
    utente_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    utente_username: Mapped[str] = mapped_column(String(255), nullable=False)
    utente_password: Mapped[str] = mapped_column(String(255), nullable=False)
    utente_ultimo_login: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    utente_ultimo_logout: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    utente_padre: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('utenti.utente_id'), nullable=True)
    utente_attivoSN: Mapped[int] = mapped_column(Integer, default=-1)
    utente_created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('utenti.utente_id'), nullable=True)
    utente_created_at: Mapped[date] = mapped_column(Date, default=date.today)
    utente_updated_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('utenti.utente_id'), nullable=True)
    utente_updated_at: Mapped[datetime] = mapped_column(DateTime, onupdate=text('CURRENT_TIMESTAMP'), default=datetime.now)
    utente_salt: Mapped[str] = mapped_column(String(36), nullable=False, default=lambda: str(uuid.uuid4()))
    utente_password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    utente_password_algo: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'legacy_plaintext'"))
    utente_password_changed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    utente_password_changed_via: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    clienti: Mapped['Cliente'] = relationship('Cliente', foreign_keys='[Cliente.utente_id]', back_populates='utente', uselist=False, cascade='all, delete-orphan')
    padre: Mapped[Optional['Utente']] = relationship('Utente', foreign_keys=[utente_padre], remote_side=[utente_id], uselist=False)
    aggiornato_da: Mapped[Optional['Utente']] = relationship('Utente', foreign_keys=[utente_updated_by], remote_side=[utente_id], uselist=False)

    @property
    def cliente(self) -> Optional['Cliente']:
        """Alias leggibile di `clienti`, che e' uselist=False nonostante il nome.

        Serve agli schemi di risposta: da un utente padre si risale al nome
        della persona senza che il chiamante debba sapere che l'attributo e'
        plurale ma contiene un solo oggetto.
        """
        return self.clienti
