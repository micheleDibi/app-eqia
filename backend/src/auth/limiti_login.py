"""Prenotazione atomica dei tentativi e attese progressive senza sleep."""

import hashlib
import hmac
import math
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import DateTime, Integer, String, delete, select, text
from sqlalchemy.dialects.mysql import insert
from sqlalchemy.orm import Mapped, mapped_column

from src.config import get_impostazioni
from src.database import Base, SessionLocal
from src.utenti.models import Utente


class LimiteLogin(Base):
    __tablename__ = "auth_login_limite"
    chiave: Mapped[str] = mapped_column(String(64), primary_key=True)
    tentativi: Mapped[int] = mapped_column(Integer, nullable=False)
    finestra_inizio: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    prossimo_tentativo: Mapped[datetime | None] = mapped_column(DateTime)
    aggiornato_il: Mapped[datetime] = mapped_column(DateTime, nullable=False)


@dataclass(frozen=True)
class Prenotazione:
    chiave_account: str
    tentativi: int
    istante: datetime


def normalizza_account(username: str) -> str:
    # Riduce le varianti anche per identita' inesistenti.
    testo = unicodedata.normalize("NFKD", username.casefold().rstrip())
    return "".join(c for c in testo if not unicodedata.combining(c))


def chiave_limite(ambito: str, valore: str) -> str:
    chiave = get_impostazioni().session_token_pepper.encode("utf-8")
    messaggio = f"login-{ambito}\0{valore}".encode("utf-8")
    return hmac.new(chiave, messaggio, hashlib.sha256).hexdigest()


def _chiave_account(db, username: str) -> str:
    # Usa la stessa uguaglianza del login: la collation MariaDB comprende
    # equivalenze Unicode (legature, caratteri ignorabili) oltre al casefold.
    # Un account esistente deve condividere il limite per TUTTE le sue varianti.
    canonico = db.execute(select(Utente.utente_username).where(
        Utente.utente_username == username,
    ).order_by(Utente.utente_id).limit(1)).scalar_one_or_none()
    return chiave_limite("account", normalizza_account(canonico if canonico is not None else username))


def _blocca_riga(db, chiave: str, ora: datetime) -> LimiteLogin:
    comando = insert(LimiteLogin).values(
        chiave=chiave, tentativi=0, finestra_inizio=ora, aggiornato_il=ora,
    ).on_duplicate_key_update(chiave=chiave)
    db.execute(comando)
    return db.execute(select(LimiteLogin).where(LimiteLogin.chiave == chiave).with_for_update()).scalar_one()


def _attesa(riga: LimiteLogin, ora: datetime, finestra: int) -> int:
    if ora >= riga.finestra_inizio + timedelta(seconds=finestra):
        riga.tentativi = 0
        riga.finestra_inizio = ora
        riga.prossimo_tentativo = None
    if riga.prossimo_tentativo and riga.prossimo_tentativo > ora:
        return max(1, math.ceil((riga.prossimo_tentativo - ora).total_seconds()))
    return 0


def _avanza(riga: LimiteLogin, ora: datetime, soglia: int, massimo: int) -> None:
    riga.tentativi += 1
    riga.aggiornato_il = ora
    ritardo = min(massimo, 2 ** min(20, riga.tentativi - soglia)) if riga.tentativi >= soglia else 0
    riga.prossimo_tentativo = ora + timedelta(seconds=ritardo) if ritardo else None


def prenota_tentativo(username: str, ip: bytes) -> Prenotazione:
    imp = get_impostazioni()
    chiavi = [chiave_limite("ip", ip.hex())]
    righe = []
    attesa = 0
    # Sempre IP poi account: nessuna inversione nell'ordine dei lock. Il lock
    # dura solo per la prenotazione, mai durante la verifica bcrypt.
    with SessionLocal.begin() as db:
        ora = db.execute(text("SELECT NOW(6)")).scalar_one()
        for ambito in ("ip", "account"):
            if ambito == "account":
                chiavi.append(_chiave_account(db, username))
            chiave = chiavi[-1]
            riga = _blocca_riga(db, chiave, ora)
            # Un altro worker puo' aver aggiornato il contatore mentre questa
            # richiesta aspettava il lock: il suo orologio iniziale e' vecchio.
            ora = db.execute(text("SELECT NOW(6)")).scalar_one()
            attesa = _attesa(riga, ora, imp.login_finestra_secondi)
            if attesa:
                break
            righe.append(riga)
        if not attesa:
            for riga, soglia in zip(righe, (imp.login_tentativi_ip, imp.login_tentativi_account)):
                _avanza(riga, ora, soglia, imp.login_attesa_massima_secondi)
            prenotazione = Prenotazione(chiavi[1], righe[1].tentativi, ora)
    if attesa:
        raise HTTPException(429, "Troppi tentativi di accesso. Attendi prima di riprovare.", headers={"Retry-After": str(attesa)})
    return prenotazione


def azzera_account(prenotazione: Prenotazione) -> None:
    # Non cancellare prenotazioni piu' recenti di questa autenticazione.
    # Il contatore IP resta valido anche dopo un accesso riuscito.
    with SessionLocal.begin() as db:
        db.execute(delete(LimiteLogin).where(
            LimiteLogin.chiave == prenotazione.chiave_account,
            LimiteLogin.tentativi == prenotazione.tentativi,
            LimiteLogin.aggiornato_il == prenotazione.istante,
        ))
