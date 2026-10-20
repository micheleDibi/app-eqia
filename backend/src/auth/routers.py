"""Rotte di autenticazione."""
from __future__ import annotations

import contextlib
import logging

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from src.auth.dipendenze import (  # noqa: F401  (get_current_utente e' riesportata)
    SessioneCorrente,
    get_current_utente,
    get_sessione_corrente,
)
from src.auth.autorizzazioni import (
    richiedi_ruolo_amministrativo,
)
from src.auth.ruoli import RUOLI_ACCESSO
from src.auth.models import ATTIVO, Esito, MotivoRevoca
from src.auth.schemas import (
    CORPO_RISPOSTA_GENERICA,
    ConfermaResetRequest,
    RichiestaResetRequest,
)
from src.auth.servizio_login import (
    cliente_principale,
    codice_ruolo,
)
from src.auth.servizio_reset import (
    applica_nuova_password,
    consuma_token,
    dati_token,
    elabora_richiesta_reset,
    nome_cliente,
    registra_esito_isolato,
    stato_token,
    username_e_email,
)
from src.auth.visibilita import utente_visibile, visibilita_di
from src.config import get_impostazioni
from src.database import get_db
from src.notifiche.backend_invio import Mailer, get_mailer
from src.notifiche.email import (
    DatiInvioCambio,
    invia_mail_cambio_eseguito,
    invia_mail_reset,
)
from src.security.password import hash_password, messaggi_policy, verifica_policy_password
from src.security.rete import ip_client, user_agent
from src.security.tempo import pavimento_temporale
from src.security.tokens import forma_token_valida
from src.utenti.models import Utente

logger = logging.getLogger("ersaf.auth")

from src.auth.accesso import router as accesso_router, emetti_sessione

router = APIRouter(prefix="/auth", tags=["Login"])
router.include_router(accesso_router)


# =============================================================================
# Recupero password
# =============================================================================
@router.post("/password-reset/request")
async def richiedi_reset(
    corpo: RichiestaResetRequest,
    request: Request,
    attivita: BackgroundTasks,
    db: Session = Depends(get_db),
    mailer: Mailer = Depends(get_mailer),
) -> Response:
    """Risponde SEMPRE 200 con lo stesso identico corpo.

    Mai un codice diverso, mai un campo diverso, mai un 429: un 429 direbbe
    all'attaccante che quell'indirizzo vale la pena insistere.

    E' `async def` mentre tutto il resto del progetto e' sync, ed e'
    deliberato: il pavimento temporale deve attendere senza occupare un thread.
    Esiste un solo threadpool da 40 slot condiviso da TUTTE le route sync, e un
    time.sleep(0.9) ne occuperebbe uno — quaranta richieste concorrenti
    congelerebbero anche /clienti/, /utenti/ e /auth/login. Il lavoro sul
    database resta sincrono, dentro run_in_threadpool.
    """
    impostazioni = get_impostazioni()
    ip = ip_client(request)
    ua = user_agent(request)
    invio = None

    async with pavimento_temporale(impostazioni.password_reset_budget_ms):
        try:
            invio = await run_in_threadpool(
                elabora_richiesta_reset, db, corpo.email, ip, ua
            )
        except Exception:
            # Un'eccezione qui produrrebbe un 500, cioe' esattamente l'oracolo
            # che questo endpoint esiste per evitare.
            db.rollback()
            logger.exception("errore interno nella richiesta di reset")
            with contextlib.suppress(Exception):
                registra_esito_isolato(ip, ua, Esito.ERRORE_INTERNO)
            invio = None

    if invio is not None:
        # Accodato DOPO il commit e fuori dal ciclo di richiesta: il tempo di
        # consegna SMTP non entra nel tempo di risposta.
        attivita.add_task(invia_mail_reset, mailer, invio)

    return Response(
        content=CORPO_RISPOSTA_GENERICA,
        media_type="application/json",
        status_code=status.HTTP_200_OK,
    )


@router.get("/password-reset/validate")
def valida_token_reset(token: str = "", db: Session = Depends(get_db)) -> dict:
    """SOLA LETTURA: non marca nulla.

    Il prefetch di un client di posta o un crawler che apre il link
    brucerebbero il token.
    """
    return stato_token(db, token)


@router.post("/password-reset/confirm")
def conferma_reset(
    corpo: ConfermaResetRequest,
    request: Request,
    attivita: BackgroundTasks,
    db: Session = Depends(get_db),
    mailer: Mailer = Depends(get_mailer),
) -> dict:
    ip = ip_client(request)
    ua = user_agent(request)

    if corpo.password != corpo.password_conferma:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "codice": "password_non_coincidono",
                "messaggi": ["Le due password non coincidono"],
            },
        )

    if not forma_token_valida(corpo.token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "codice": "token_non_valido",
                "messaggi": ["Il link non e' piu' valido. Richiedine uno nuovo."],
            },
        )

    # Si legge l'utente PRIMA di consumare, per poter applicare la regola
    # "password diversa da username e email". La lettura non modifica nulla.
    riferimenti = dati_token(db, corpo.token)
    username, email = (
        username_e_email(db, riferimenti.utente_id) if riferimenti else (None, None)
    )

    violate = verifica_policy_password(corpo.password, username=username, email=email)
    if violate:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "codice": "policy_password",
                "regole_violate": violate,
                "messaggi": messaggi_policy(violate),
            },
        )

    # bcrypt (~250 ms in produzione) FUORI dalla transazione: dentro terrebbe un
    # lock di riga su password_reset_token per un quarto di secondo senza
    # motivo. L'unicita' della transazione riguarda gli effetti sul database.
    nuovo_hash = hash_password(corpo.password)

    try:
        # Query [C] della 002: consumo atomico. Due richieste concorrenti: solo
        # una ottiene rowcount == 1.
        if consuma_token(db, corpo.token, ip, ua) != 1 or riferimenti is None:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "codice": "token_non_valido",
                    "messaggi": ["Il link non e' piu' valido. Richiedine uno nuovo."],
                },
            )

        applica_nuova_password(
            db, riferimenti.utente_id, riferimenti.prt_id, nuovo_hash
        )
        nome = nome_cliente(db, riferimenti.utente_id)
        db.commit()
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception("errore nel completamento del cambio password")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"codice": "errore_interno"},
        )

    logger.info("cambio password completato, prt_id=%s", riferimenti.prt_id)

    if riferimenti.prt_email_inviata:
        # Dopo il commit. Il destinatario e' l'indirizzo a cui il link e' stato
        # realmente spedito, congelato dalla 002: se il cliente ha cambiato
        # email nel frattempo, la notifica segue il link.
        attivita.add_task(
            invia_mail_cambio_eseguito,
            mailer,
            DatiInvioCambio(
                destinatario=riferimenti.prt_email_inviata, nome=nome, ip=ip
            ),
        )

    # L'utente NON viene autenticato: la risposta rimanda al login.
    return {
        "message": "Password aggiornata. Ora puoi accedere con le nuove credenziali."
    }



def _bersaglio_non_impersonabile() -> HTTPException:
    """Un solo messaggio per tutti i motivi di rifiuto sul bersaglio.

    Chi arriva qui e' gia' autenticato e ha comunque accesso a GET /clienti/,
    quindi non c'e' enumerazione da impedire; l'uniformita' serve a non dire
    quale controllo ha fallito.
    """
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Utente non trovato o non impersonabile.",
    )


@router.post("/login-as/{utente_id}")
def login_as(
    utente_id: int,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_utente: Utente = Depends(get_current_utente),
):
    """Emette una sessione a nome di un altro utente.

    Prima non chiedeva nulla: un POST anonimo su un id qualsiasi restituiva un
    token valido. Questo rendeva inutile ogni altra difesa - hashing, sessioni
    revocabili, recupero password - perche' per entrare non serviva piu'
    conoscere una password. Ora servono una sessione valida e un ruolo
    ammesso, e l'operazione lascia una traccia con entrambi gli id.
    """
    ip = ip_client(request)
    ua = user_agent(request)

    # --- chi chiama ---------------------------------------------------------
    ruolo_chiamante = richiedi_ruolo_amministrativo(
        db, current_utente, "impersonificazione"
    )

    # --- chi viene impersonato ----------------------------------------------
    # Prima di qualunque altro controllo sul bersaglio: il ramo "Nazionale"
    # qui sotto risponde 403 con un testo suo, e messo prima rivelerebbe il
    # ruolo di utenti che il chiamante non vede. Il 404 e' lo stesso di un id
    # inesistente.
    vis = visibilita_di(db, current_utente)
    if not vis.nazionale and not utente_visibile(db, vis, utente_id):
        raise _bersaglio_non_impersonabile()

    utente = db.get(Utente, utente_id)
    if utente is None:
        raise _bersaglio_non_impersonabile()

    # Il login normale passa da verifica_credenziali, che rifiuta gli utenti
    # spenti. Qui non c'e' password da verificare, quindi il controllo va
    # ripetuto: senza, si poteva impersonare un account disattivato.
    if utente.utente_attivoSN != ATTIVO:
        raise _bersaglio_non_impersonabile()

    cliente = cliente_principale(db, utente.utente_id)
    if cliente is None:
        raise _bersaglio_non_impersonabile()

    if cliente.cliente_ruolo not in RUOLI_ACCESSO:
        raise _bersaglio_non_impersonabile()

    ruolo = codice_ruolo(db, cliente.cliente_ruolo)
    if (ruolo or "").lower() == "nazionale":
        # Allineato al login: per il ruolo Nazionale non si emette sessione
        # senza 2FA. Senza questo ramo, login-as era la strada per ottenere
        # proprio la sessione che il login nega.
        logger.warning(
            "impersonificazione negata: il bersaglio utente_id=%s e' Nazionale",
            utente.utente_id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Il ruolo Nazionale richiede la verifica a due fattori.",
        )

    dati = emetti_sessione(db, utente, ruolo, request, response)
    # Traccia di audit: entrambi gli id sulla stessa riga, perche' da qui in
    # poi i log della sessione emessa parlano solo del bersaglio.
    logger.warning(
        "impersonificazione: utente_id=%s (%s) assume l'identita' di utente_id=%s",
        current_utente.utente_id,
        ruolo_chiamante,
        utente.utente_id,
    )

    return dati
