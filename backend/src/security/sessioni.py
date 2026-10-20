"""Sessioni applicative revocabili (migrazione 004).

Sostituiscono l'header `x-utente-id`, che era un intero non firmato: chiunque
poteva scrivere `x-utente-id: 1` e impersonare qualsiasi utente.

Il token consegnato al client e' opaco, 32 byte da CSPRNG. Nel database c'e'
solo SHA-256(token || SESSION_TOKEN_PEPPER). Nessun JWT: un JWT non e'
revocabile senza una lista di revoca, e la revoca al cambio password e'
esattamente il requisito.

La scadenza e' SCORREVOLE (ADR 0008): `sess_expires_at` nasce a
NOW() + SESSION_INATTIVITA_GIORNI e ogni uso la sposta avanti, con la stessa
soglia di `sess_last_seen_at`; `sess_created_at` fissa il tetto assoluto
SESSION_DURATA_MASSIMA_GIORNI, oltre il quale la validazione respinge la
sessione anche se usata ogni giorno. Chi rinnova la riga rimanda anche il
cookie con Max-Age pieno, altrimenti il browser lo perderebbe prima del server.

NON si tocca `utente_session`, che appartiene alla piattaforma legacy Instant
Developer ancora in produzione.
"""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from src.auth.models import ATTIVO, AuthSessione, MotivoRevoca
from src.config import get_impostazioni
from src.security.tempo import istante_meno_giorni, istante_meno_minuti, istante_piu_giorni
from src.security.tokens import TipoToken, forma_token_valida, genera_token, impronta
from src.utenti.models import Utente

logger = logging.getLogger("ersaf.sessioni")

# Ogni quanto si aggiorna sess_last_seen_at. Senza una soglia sarebbe una
# scrittura per ogni richiesta autenticata.
#
# E' un numero di minuti e non un timedelta, e la differenza non e' di stile:
# `func.now() - timedelta(minutes=5)` viene compilato in `NOW() - %s` con il
# timedelta legato come parametro DATETIME, quindi MariaDB riceve
# `NOW() - '00:05:00'` e fa una sottrazione NUMERICA. Con sql_mode
# STRICT_TRANS_TABLES quella troncatura e' un errore 1292 e l'intera richiesta
# autenticata fallisce; senza, la condizione e' semplicemente sempre falsa e la
# soglia non funziona. Serve `NOW() - INTERVAL 5 MINUTE`.
MINUTI_SOGLIA_ULTIMO_ACCESSO = 5


def crea_sessione(
    db: Session, utente_id: int, ip: bytes | None, user_agent: str | None
) -> tuple[str, datetime]:
    """Restituisce il token IN CHIARO — che non va mai loggato — e la scadenza.

    Il chiamante e' responsabile del commit: al login la creazione della
    sessione fa parte della stessa transazione dell'eventuale rehash.
    """
    token = genera_token()
    sessione = AuthSessione(
        utente_id=utente_id,
        sess_token_hash=impronta(token, TipoToken.SESSIONE),
        sess_created_at=func.now(),
        sess_expires_at=istante_piu_giorni(get_impostazioni().session_inattivita_giorni),
        sess_ip=ip,
        sess_user_agent=user_agent,
    )
    db.add(sessione)
    db.flush()
    db.refresh(sessione)
    return token, sessione.sess_expires_at


def sessioni_valide():
    """Query comune per accesso cookie e presenza: identici criteri di revoca."""
    return (
        select(AuthSessione.sess_id, AuthSessione.utente_id)
        .join(Utente, Utente.utente_id == AuthSessione.utente_id)
        .where(
            AuthSessione.sess_revoked_at.is_(None),
            AuthSessione.sess_expires_at > func.now(),
            AuthSessione.sess_created_at
            > istante_meno_giorni(get_impostazioni().session_durata_massima_giorni),
            Utente.utente_attivoSN == ATTIVO,
            or_(
                Utente.utente_password_changed_at.is_(None),
                AuthSessione.sess_created_at >= Utente.utente_password_changed_at,
            ),
        )
    )


def valida_sessione(db: Session, token: str) -> tuple[int, int] | None:
    """Query [B] della migrazione 004. Restituisce (sess_id, utente_id).

    Oltre a revoca e scadenza scorrevole, la query applica il tetto assoluto
    dalla creazione e scarta le sessioni di utenti disattivati e quelle nate
    PRIMA dell'ultimo cambio password: e' difesa in profondita', perche' se la
    revoca massiva della [A] fallisse quelle sessioni resterebbero altrimenti
    valide.
    """
    if not forma_token_valida(token):
        return None

    riga = db.execute(
        sessioni_valide().where(AuthSessione.sess_token_hash == impronta(token, TipoToken.SESSIONE))
    ).first()
    return (riga.sess_id, riga.utente_id) if riga else None


def segna_ultimo_accesso(db: Session, sess_id: int) -> bool:
    """Aggiorna sess_last_seen_at e sposta avanti la scadenza, non piu' spesso
    della soglia. Restituisce True quando ha scritto: e' il segnale per
    rimandare il cookie con il Max-Age pieno."""
    esito = db.execute(
        update(AuthSessione)
        .where(
            AuthSessione.sess_id == sess_id,
            or_(
                AuthSessione.sess_last_seen_at.is_(None),
                AuthSessione.sess_last_seen_at
                < istante_meno_minuti(MINUTI_SOGLIA_ULTIMO_ACCESSO),
            ),
        )
        .values(
            sess_last_seen_at=func.now(),
            sess_expires_at=istante_piu_giorni(
                get_impostazioni().session_inattivita_giorni
            ),
        )
        .execution_options(synchronize_session=False)
    )
    db.commit()
    return esito.rowcount > 0


def revoca_sessione(db: Session, token: str, motivo: MotivoRevoca) -> int:
    if not forma_token_valida(token):
        return 0
    esito = db.execute(
        update(AuthSessione)
        .where(
            AuthSessione.sess_token_hash == impronta(token, TipoToken.SESSIONE),
            AuthSessione.sess_revoked_at.is_(None),
        )
        .values(sess_revoked_at=func.now(), sess_revoked_reason=motivo.value)
        .execution_options(synchronize_session=False)
    )
    return esito.rowcount


def revoca_sessioni_utente(db: Session, utente_id: int, motivo: MotivoRevoca) -> int:
    """Query [A] della migrazione 004: revoca TUTTE le sessioni di un utente.

    Va eseguita nella stessa transazione dello UPDATE della password. Il
    chiamante non committa qui.
    """
    esito = db.execute(
        update(AuthSessione)
        .where(
            AuthSessione.utente_id == utente_id,
            AuthSessione.sess_revoked_at.is_(None),
        )
        .values(sess_revoked_at=func.now(), sess_revoked_reason=motivo.value)
        .execution_options(synchronize_session=False)
    )
    return esito.rowcount
