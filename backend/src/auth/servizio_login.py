"""Logica del login: verifica delle credenziali e rehash pigro.

Separata dal router perche' il flusso ha cinque rami che vanno letti insieme,
e perche' i test devono poterla esercitare senza passare da HTTP.
"""

from __future__ import annotations

import logging
import secrets

from sqlalchemy import case, func, select, update
from sqlalchemy.orm import Session

from src.auth.models import ATTIVO, RUOLI_ATTUATORE
from src.clienti.models import Cliente
from src.errori import ErrorePasswordTroppoLunga
from src.ruolo.models import Ruolo
from src.security.password import hash_fittizio, hash_password, verify_password
from src.utenti.models import Utente

logger = logging.getLogger("ersaf.login")


def trova_utente_per_username(db: Session, username: str) -> tuple[Utente | None, bool]:
    """Restituisce (utente, ambiguo).

    `utente_username` NON ha UNIQUE nel database, malgrado il modello lo
    dichiari: in produzione ci sono sei gruppi di duplicati, incluso il valore
    '/'. Si prendono due candidati proprio per accorgersene: un'identita'
    ambigua non deve mai autenticare.
    """
    candidati = (
        db.execute(
            select(Utente)
            .where(Utente.utente_username == username)
            .order_by(Utente.utente_id)
            .limit(2)
        )
        .scalars()
        .all()
    )
    if len(candidati) > 1:
        return None, True
    return (candidati[0] if candidati else None), False


def riscrivi_hash(db: Session, utente_id: int, nuovo_hash: str) -> None:
    """Rehash pigro: converte il FORMATO di memorizzazione di UNA riga.

    NON si toccano utente_password_changed_at ne' utente_password_changed_via,
    ed e' il punto piu' insidioso di tutto il lavoro. Quel campo e' il cut-off
    della query [B] della migrazione 004, che scarta le sessioni con
    sess_created_at anteriore. Valorizzarlo al login significherebbe:

      a) invalidare le sessioni su tutti gli altri dispositivi al PRIMO login
         post-migrazione di ognuno dei 4.771 utenti;
      b) potenzialmente invalidare la sessione che si sta creando adesso —
         DATETIME ha risoluzione al secondo, e basta che i due NOW() cadano
         sullo stesso confine perche' il confronto fallisca e l'utente riceva
         un 401 sul token appena emesso.

    utente_password_changed_at resta riservato ai cambi VERI.

    La WHERE e' sulla sola chiave primaria: e' una delle due sole scritture
    ammesse su utenti.utente_password, l'altra e' la conferma del reset.
    """
    esito = db.execute(
        update(Utente)
        .where(Utente.utente_id == utente_id)
        .values(
            utente_password_hash=nuovo_hash,
            utente_password_algo="bcrypt",
            # NOT NULL nel database: "svuotare" significa stringa vuota.
            utente_password="",
        )
        .execution_options(synchronize_session=False)
    )
    if esito.rowcount != 1:
        raise RuntimeError(
            f"rehash pigro: righe modificate={esito.rowcount}, attesa esattamente 1"
        )


def verifica_credenziali(db: Session, utente: Utente | None, password: str) -> bool:
    """True se le credenziali sono valide. Converte il formato se necessario.

    Il ramo "utente inesistente" e quello "utente disattivato" eseguono
    comunque un bcrypt contro l'hash fittizio: senza, un 401 immediato direbbe
    all'attaccante che l'account non esiste o e' spento.
    """
    if utente is None or utente.utente_attivoSN != ATTIVO:
        verify_password(password, hash_fittizio())
        return False

    if utente.utente_password_hash:
        return verify_password(password, utente.utente_password_hash)

    legacy = utente.utente_password or ""
    if legacy == "":
        # Guardia indispensabile: la colonna e' NOT NULL, quindi la stringa
        # vuota esiste davvero, e compare_digest("", "") e' True. Senza questa
        # riga si entrerebbe con la password vuota su ogni riga gia' convertita
        # o bonificata a mano.
        verify_password(password, hash_fittizio())
        return False

    corretta = secrets.compare_digest(
        legacy.encode("utf-8"), password.encode("utf-8")
    )
    if not corretta:
        verify_password(password, hash_fittizio())
        return False
    if corretta:
        try:
            riscrivi_hash(db, utente.utente_id, hash_password(password))
        except ErrorePasswordTroppoLunga:
            # La diagnostica 000 dice che oggi non esistono password oltre i 72
            # byte, ma non ci si scommette: si salta la conversione e si lascia
            # entrare l'utente.
            logger.warning(
                "rehash saltato: password legacy oltre 72 byte, utente_id=%s",
                utente.utente_id,
            )
    return corretta


def cliente_principale(db: Session, utente_id: int):
    return db.execute(
        select(
            Cliente.cliente_id,
            Cliente.cliente_ruolo,
            Cliente.cliente_email,
            Cliente.cliente_nome,
            Cliente.cliente_cognome,
            Cliente.azienda_id,
        )
        .where(Cliente.utente_id == utente_id)
        .order_by(
            case((Cliente.cliente_ruolo.in_(RUOLI_ATTUATORE), 0), else_=1),
            Cliente.cliente_id,
        )
        .limit(1)
    ).first()


def codice_ruolo(db: Session, ruolo_id: int | None) -> str | None:
    if ruolo_id is None:
        return None
    return db.execute(
        select(Ruolo.ruolo_codice).where(Ruolo.ruolo_id == ruolo_id)
    ).scalar_one_or_none()
