"""Logica del recupero password.

Separata dal router perche' l'ordine delle operazioni e' il contenuto della
feature, non un dettaglio implementativo, e perche' i test devono poterla
esercitare senza passare da HTTP.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from sqlalchemy import case, func, or_, select, update
from sqlalchemy.orm import Session

from src.auth.models import (
    ATTIVO,
    RUOLI_ATTUATORE,
    AuthSessione,
    Esito,
    MotivoRevoca,
    MotivoRevocaToken,
    PasswordResetRichiesta,
    PasswordResetToken,
)
from src.clienti.models import Cliente
from src.config import get_impostazioni
from src.notifiche.email import DatiInvioReset
from src.security.sessioni import revoca_sessioni_utente
from src.security.tempo import istante_meno_ore, istante_piu_minuti
from src.security.tokens import TipoToken, genera_token, impronta
from src.utenti.models import Utente

logger = logging.getLogger("ersaf.reset")

# Validazione formale volutamente permissiva: serve solo a distinguere una
# stringa che non puo' essere un indirizzo da una che potrebbe esserlo. Un
# indirizzo malformato NON produce un errore: viene trattato come sconosciuto,
# con la stessa identica risposta.
RE_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
LUNGHEZZA_MASSIMA_EMAIL = 320


def normalizza_email(grezza: str | None) -> str:
    """strip() e lower() sul PARAMETRO, mai sulla colonna.

    Applicare LOWER()/TRIM() alla colonna annullerebbe l'indice
    ix_clienti_email della migrazione 005, e un full scan e' anche un canale
    laterale: il tempo cambierebbe col numero di righe che corrispondono. La
    collation utf8mb4_unicode_ci e' gia' case-insensitive.
    """
    return (grezza or "")[:LUNGHEZZA_MASSIMA_EMAIL].strip().lower()


@dataclass(frozen=True)
class UtenteIdoneo:
    utente_id: int
    email: str
    nome: str


def conta_richieste(db: Session, ip: bytes, impronta_email: str) -> tuple[int, int]:
    """Query di riferimento della migrazione 003.

    L'IP arriva gia' impacchettato, quindi INET6_ATON non serve. La finestra si
    calcola nel database: un solo orologio.

    Conteggio e inserimento NON sono atomici, ed e' una scelta: richieste
    davvero simultanee possono far passare la sesta. E' un limite di
    frequenza, non un confine di sicurezza; renderlo atomico costerebbe un
    lock e non varrebbe la pena.
    """
    riga = db.execute(
        select(
            func.coalesce(
                func.sum(case((PasswordResetRichiesta.prr_ip == ip, 1), else_=0)), 0
            ),
            func.coalesce(
                func.sum(
                    case(
                        (
                            PasswordResetRichiesta.prr_identificativo_hash
                            == impronta_email,
                            1,
                        ),
                        else_=0,
                    )
                ),
                0,
            ),
        ).where(
            PasswordResetRichiesta.prr_created_at >= istante_meno_ore(1),
            or_(
                PasswordResetRichiesta.prr_ip == ip,
                PasswordResetRichiesta.prr_identificativo_hash == impronta_email,
            ),
        )
    ).one()
    return int(riga[0]), int(riga[1])


def risolvi_email(db: Session, email: str):
    """Tutte le righe `clienti` con quell'indirizzo, senza filtro di ruolo.

    Il filtro manca di proposito: serve distinguere "nessun cliente" da
    "cliente non attuatore", e con una sola interrogazione.
    """
    return db.execute(
        select(
            Cliente.cliente_id,
            Cliente.cliente_ruolo,
            Cliente.cliente_email,
            Cliente.cliente_nome,
            Utente.utente_id,
            Utente.utente_attivoSN,
        )
        .join(Utente, Utente.utente_id == Cliente.utente_id)
        # Colonna NUDA: usa ix_clienti_email.
        .where(Cliente.cliente_email == email)
        .order_by(Cliente.cliente_id)
    ).all()


def classifica(righe) -> tuple[Esito, UtenteIdoneo | None]:
    """Dall'insieme delle righe all'esito interno."""
    if not righe:
        return Esito.IDENTIFICATIVO_SCONOSCIUTO, None

    attuatori = [r for r in righe if r.cliente_ruolo in RUOLI_ATTUATORE]
    if not attuatori:
        # Ruoli 0 (Utente), 6 (Operatore): trattati come i
        # sottoscrittori, nessuna mail.
        return Esito.RUOLO_NON_ABILITATO, None

    attivi = [r for r in attuatori if r.utente_attivoSN == ATTIVO]
    if not attivi:
        return Esito.UTENTE_DISATTIVATO, None

    # Deduplicazione su utente_id e NON su cliente_id: quattro utenti hanno due
    # righe `clienti`, e senza questo risulterebbero ambigui per un artefatto
    # dei dati, restando senza possibilita' di recuperare la password.
    per_utente: dict[int, object] = {}
    for riga in attivi:
        per_utente.setdefault(riga.utente_id, riga)

    if len(per_utente) > 1:
        # Venti attuatori condividono l'indirizzo con un altro cliente:
        # inviare a tutti significherebbe mandare a Tizio il link di Caio.
        return Esito.IDENTIFICATIVO_AMBIGUO, None

    riga = next(iter(per_utente.values()))
    if not riga.cliente_email or not RE_EMAIL.match(riga.cliente_email):
        # Difensivo: si cerca *per* email, quindi l'indirizzo trovato e' per
        # costruzione quello digitato.
        return Esito.EMAIL_MANCANTE, None

    return Esito.EMAIL_INVIATA, UtenteIdoneo(
        utente_id=riga.utente_id, email=riga.cliente_email, nome=riga.cliente_nome or ""
    )


def elabora_richiesta_reset(
    db: Session, email_grezza: str, ip: bytes, user_agent: str | None
) -> DatiInvioReset | None:
    """L'ordine delle operazioni e' vincolante.

    1. normalizzazione
    2. rate limit, PRIMA di qualunque lookup
    3. risoluzione dell'indirizzo
    4. riga di audit, SEMPRE
    5. solo su email_inviata: revoca dei token precedenti e inserimento del
       nuovo, nella stessa transazione

    Restituisce i dati per l'invio, oppure None se non si deve inviare nulla.
    """
    impostazioni = get_impostazioni()

    email = normalizza_email(email_grezza)
    formalmente_valida = bool(RE_EMAIL.match(email))
    # Stesso pepper della 002, come prescrive il commento della 003.
    impronta_email = impronta(email, TipoToken.RESET)

    per_ip, per_account = conta_richieste(db, ip, impronta_email)
    limite = impostazioni.password_reset_rate_limit_per_hour

    idoneo: UtenteIdoneo | None = None
    if per_ip >= limite:
        esito = Esito.RATE_LIMITED_IP
    elif per_account >= limite:
        esito = Esito.RATE_LIMITED_ACCOUNT
    elif not formalmente_valida:
        esito = Esito.IDENTIFICATIVO_SCONOSCIUTO
    else:
        esito, idoneo = classifica(risolvi_email(db, email))

    riga_audit = PasswordResetRichiesta(
        prr_created_at=func.now(),
        prr_ip=ip,
        prr_identificativo_hash=impronta_email,
        # NULL quando l'identificativo non corrisponde a nessun account: non si
        # ricrea nel log l'oracolo che l'endpoint evita di esporre.
        prr_utente_id=idoneo.utente_id if idoneo else None,
        prr_esito=esito.value,
        prr_user_agent=user_agent,
    )
    db.add(riga_audit)
    db.flush()

    invio: DatiInvioReset | None = None
    if esito is Esito.EMAIL_INVIATA and idoneo is not None:
        # Query [A] della 002: revoca dei token precedenti PRIMA di inserire il
        # nuovo, nella stessa transazione.
        db.execute(
            update(PasswordResetToken)
            .where(
                PasswordResetToken.utente_id == idoneo.utente_id,
                PasswordResetToken.prt_consumed_at.is_(None),
                PasswordResetToken.prt_revoked_at.is_(None),
            )
            .values(
                prt_revoked_at=func.now(),
                prt_revoked_reason=MotivoRevocaToken.NUOVA_RICHIESTA.value,
            )
            .execution_options(synchronize_session=False)
        )

        token = genera_token()
        db.add(
            PasswordResetToken(
                utente_id=idoneo.utente_id,
                prt_token_hash=impronta(token, TipoToken.RESET),
                prt_created_at=func.now(),
                prt_expires_at=istante_piu_minuti(
                    impostazioni.password_reset_token_ttl_minutes
                ),
                prt_request_ip=ip,
                prt_request_ua=user_agent,
                prt_email_inviata=idoneo.email,
            )
        )
        invio = DatiInvioReset(
            prr_id=riga_audit.prr_id,
            destinatario=idoneo.email,
            nome=idoneo.nome,
            token=token,
            scadenza_minuti=impostazioni.password_reset_token_ttl_minutes,
        )

    db.commit()
    # Nel log finisce prr_id, mai l'indirizzo e mai il token.
    logger.info(
        "richiesta di reset elaborata, prr_id=%s esito=%s", riga_audit.prr_id, esito.value
    )
    return invio


def registra_esito_isolato(ip: bytes, user_agent: str | None, esito: Esito) -> None:
    """Registra un esito su una sessione propria, quando quella della richiesta
    e' compromessa da un'eccezione."""
    from src.database import SessionLocal

    db = SessionLocal()
    try:
        db.add(
            PasswordResetRichiesta(
                prr_created_at=func.now(),
                prr_ip=ip,
                # Non si conosce l'identificativo in questo ramo, e non lo si
                # vuole ricostruire: 64 zeri come segnaposto.
                prr_identificativo_hash="0" * 64,
                prr_utente_id=None,
                prr_esito=esito.value,
                prr_user_agent=user_agent,
            )
        )
        db.commit()
    finally:
        db.close()


# =============================================================================
# Validazione e consumo del token
# =============================================================================
def stato_token(db: Session, token: str) -> dict:
    """Query [B] della 002, in SOLA LETTURA.

    Nessuna scrittura e nessuna riga di audit: il prefetch di un client di
    posta o un crawler brucerebbe il token.

    Divergenza consapevole dalla forma della [B]: quella query mette tutte le
    condizioni nella WHERE e puo' solo rispondere "riga o niente", mentre la
    risposta deve distinguere scaduto / gia_usato / non_valido. Si cerca sulla
    sola UNIQUE — stessa lookup O(1) — e si classifica qui. Il confronto di
    scadenza resta a carico del database: un solo orologio.
    """
    from src.security.tokens import forma_token_valida

    if not forma_token_valida(token):
        return {"valido": False, "motivo": "non_valido"}

    riga = db.execute(
        select(
            PasswordResetToken.prt_consumed_at,
            PasswordResetToken.prt_revoked_at,
            (PasswordResetToken.prt_expires_at > func.now()).label("non_scaduto"),
        ).where(PasswordResetToken.prt_token_hash == impronta(token, TipoToken.RESET))
    ).first()

    if riga is None:
        return {"valido": False, "motivo": "non_valido"}
    if riga.prt_consumed_at is not None:
        return {"valido": False, "motivo": "gia_usato"}
    if riga.prt_revoked_at is not None:
        # Un token revocato viene riportato come non valido e non come
        # gia_usato: dire "e' stato revocato" confermerebbe che quel token e'
        # esistito.
        return {"valido": False, "motivo": "non_valido"}
    if not riga.non_scaduto:
        return {"valido": False, "motivo": "scaduto"}
    return {"valido": True}


def consuma_token(db: Session, token: str, ip: bytes, user_agent: str | None) -> int:
    """Query [C] della 002: consumo ATOMICO.

    Restituisce il numero di righe modificate: deve essere 1. Se e' 0 il token
    era gia' usato, scaduto o revocato, e la password NON va cambiata.

    LE TRE CONDIZIONI NELLA WHERE SONO PORTANTI e non vanno spostate in
    Python. SQLAlchemy attiva sempre CLIENT.FOUND_ROWS sui dialetti MySQL
    (dialects/mysql/mysqldb.py, documentato come hardcoded), quindi rowcount
    conta le righe TROVATE, non quelle modificate. Una versione senza quelle
    condizioni restituirebbe 1 anche al secondo tentativo, perche' la riga
    verrebbe comunque trovata, e il controllo di stato finirebbe fuori
    dall'atomicita'.
    """
    esito = db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.prt_token_hash == impronta(token, TipoToken.RESET),
            PasswordResetToken.prt_consumed_at.is_(None),
            PasswordResetToken.prt_revoked_at.is_(None),
            PasswordResetToken.prt_expires_at > func.now(),
        )
        .values(
            prt_consumed_at=func.now(), prt_consumed_ip=ip, prt_consumed_ua=user_agent
        )
        .execution_options(synchronize_session=False)
    )
    return esito.rowcount


def applica_nuova_password(
    db: Session, utente_id: int, prt_id: int, nuovo_hash: str
) -> None:
    """Scrittura della password, revoca degli altri token e di tutte le
    sessioni. Tutto nella transazione del chiamante."""
    aggiornate = db.execute(
        update(Utente)
        .where(Utente.utente_id == utente_id)
        .values(
            utente_password_hash=nuovo_hash,
            utente_password_algo="bcrypt",
            utente_password_changed_at=func.now(),
            utente_password_changed_via="reset_email",
            # NOT NULL nel database: stringa vuota, mai NULL.
            utente_password="",
        )
        .execution_options(synchronize_session=False)
    )
    if aggiornate.rowcount != 1:
        raise RuntimeError(
            f"cambio password: righe modificate={aggiornate.rowcount}, attesa 1"
        )

    # Query [D] della 002: revoca ogni altro token dello stesso utente.
    db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.utente_id == utente_id,
            PasswordResetToken.prt_id != prt_id,
            PasswordResetToken.prt_consumed_at.is_(None),
            PasswordResetToken.prt_revoked_at.is_(None),
        )
        .values(
            prt_revoked_at=func.now(),
            prt_revoked_reason=MotivoRevocaToken.PASSWORD_CAMBIATA.value,
        )
        .execution_options(synchronize_session=False)
    )

    # Query [A] della 004: revoca TUTTE le sessioni.
    revoca_sessioni_utente(db, utente_id, MotivoRevoca.PASSWORD_RESET)


def dati_token(db: Session, token: str):
    """prt_id, utente_id e indirizzo a cui il link e' stato spedito."""
    return db.execute(
        select(
            PasswordResetToken.prt_id,
            PasswordResetToken.utente_id,
            PasswordResetToken.prt_email_inviata,
        ).where(PasswordResetToken.prt_token_hash == impronta(token, TipoToken.RESET))
    ).first()


def nome_cliente(db: Session, utente_id: int) -> str:
    valore = db.execute(
        select(Cliente.cliente_nome)
        .where(Cliente.utente_id == utente_id)
        .order_by(Cliente.cliente_id)
        .limit(1)
    ).scalar_one_or_none()
    return valore or ""


def username_e_email(db: Session, utente_id: int) -> tuple[str | None, str | None]:
    """Serve alla policy: la password non puo' coincidere con l'uno o l'altra."""
    riga = db.execute(
        select(Utente.utente_username, Cliente.cliente_email)
        .join(Cliente, Cliente.utente_id == Utente.utente_id, isouter=True)
        .where(Utente.utente_id == utente_id)
        .order_by(Cliente.cliente_id)
        .limit(1)
    ).first()
    return (riga.utente_username, riga.cliente_email) if riga else (None, None)
