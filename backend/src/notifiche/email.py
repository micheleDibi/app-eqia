"""Composizione e invio delle mail del recupero password.

Layout, firma, logo CID e alternativa testuale sono condivisi in messaggio_email.

I testi vivono in `messaggi_email` (migrazione 006), cosi' restano
modificabili senza rideploy come per il resto della piattaforma. I segnaposto
sono {{nome}}, e OGNI valore dinamico viene escapato in HTML.

L'invio avviene sempre in BackgroundTasks, mai dentro il ciclo di richiesta:
il tempo di consegna SMTP non deve entrare nel tempo di risposta.
"""

from __future__ import annotations

import html
import logging
import re
from dataclasses import dataclass
from datetime import datetime
from email.message import EmailMessage
from urllib.parse import quote
from zoneinfo import ZoneInfo



from sqlalchemy import select, update

from src.auth.models import Esito, PasswordResetRichiesta
from src.config import get_impostazioni
from src.database import SessionLocal
from src.errori import ErroreTemplateEmail
from src.notifiche.backend_invio import Mailer
from src.notifiche.messaggio_email import crea_messaggio
from src.notifiche.models import (
    CODICE_RESET_ESEGUITO,
    CODICE_RESET_RICHIESTA,
    MessaggioEmail,
)
from src.security.rete import spacchetta_ip

logger = logging.getLogger("ersaf.email")

RE_SEGNAPOSTO = re.compile(r"\{\{\s*(\w+)\s*\}\}")
FUSO = ZoneInfo("Europe/Rome")


@dataclass(frozen=True)
class DatiInvioReset:
    prr_id: int
    destinatario: str
    nome: str
    token: str
    scadenza_minuti: int


@dataclass(frozen=True)
class DatiInvioCambio:
    destinatario: str
    nome: str
    ip: bytes | None


def costruisci_link_reset(token: str) -> str:
    """Il link si costruisce dalla configurazione, MAI dall'header Host della
    richiesta: altrimenti un attaccante potrebbe farsi recapitare il token su
    un dominio scelto da lui."""
    base = get_impostazioni().frontend_base_url
    return f"{base}/reimposta-password?token={quote(token, safe='')}"


def rendi_html(testo: str, valori: dict[str, str]) -> str:
    """Sostituzione dei segnaposto in UNA SOLA passata.

    La passata unica e' una proprieta' portante, non un dettaglio: re.sub non
    riscandisce il testo appena inserito, quindi un valore dinamico che
    contenesse "{{link_reset}}" resta testo invece di diventare il link vero.

    Non si usa str.format: il template della 006 contiene CSS inline con
    parentesi graffe e format esploderebbe.

    Ogni valore viene escapato con quote=True, corretto anche dentro
    href="{{link_reset}}": trasforma le virgolette in &quot;.
    """
    mancanti: list[str] = []

    def sostituisci(trovato: re.Match[str]) -> str:
        chiave = trovato.group(1)
        if chiave not in valori:
            mancanti.append(chiave)
            return trovato.group(0)
        return html.escape(str(valori[chiave]), quote=True)

    risultato = RE_SEGNAPOSTO.sub(sostituisci, testo)
    if mancanti:
        # Meglio non spedire nulla che spedire una mail con "{{link_reset}}"
        # scritto a video.
        raise ErroreTemplateEmail(
            f"segnaposto senza valore nel template: {sorted(set(mancanti))}"
        )
    return risultato


def rendi_oggetto(testo: str, valori: dict[str, str]) -> str:
    """L'oggetto non e' HTML: escaparlo produrrebbe "&amp;" a video.

    Si tolgono pero' CR e LF da ogni valore: un nome che contenesse
    "\\r\\nBcc: ..." sarebbe header injection.
    """

    def sostituisci(trovato: re.Match[str]) -> str:
        valore = str(valori.get(trovato.group(1), trovato.group(0)))
        return valore.replace("\r", " ").replace("\n", " ")

    return RE_SEGNAPOSTO.sub(sostituisci, testo)[:255]


def carica_template(db, codice: str) -> tuple[str, str]:
    riga = db.execute(
        select(
            MessaggioEmail.messaggio_email_oggetto, MessaggioEmail.messaggio_email_testo
        ).where(MessaggioEmail.messaggio_email_codice == codice)
    ).first()
    if riga is None or not riga.messaggio_email_testo:
        raise ErroreTemplateEmail(
            f"template '{codice}' assente da messaggi_email: applicare la "
            "migrazione 006"
        )
    return riga.messaggio_email_oggetto or "", riga.messaggio_email_testo


def componi(
    oggetto: str, corpo_html: str, destinatario: str
) -> EmailMessage:
    return crea_messaggio(oggetto, corpo_html, destinatario, get_impostazioni().smtp_from)


def invia_mail_reset(mailer: Mailer, dati: DatiInvioReset) -> None:
    """Task di background: gira DOPO che i byte della risposta sono partiti.

    Apre una PROPRIA sessione e non riusa quella della richiesta: gira in un
    thread diverso da quello in cui la Session e' stata creata (e una Session
    non e' thread-safe), erediterebbe una transazione eventualmente in errore,
    e l'ordine fra teardown delle dipendenze e task di background e' gia'
    cambiato una volta in FastAPI.
    """
    db = SessionLocal()
    try:
        oggetto_grezzo, corpo_grezzo = carica_template(db, CODICE_RESET_RICHIESTA)
        valori = {
            "nome": dati.nome or "utente",
            "link_reset": costruisci_link_reset(dati.token),
            "scadenza_minuti": str(dati.scadenza_minuti),
        }
        messaggio = componi(
            rendi_oggetto(oggetto_grezzo, valori),
            rendi_html(corpo_grezzo, valori),
            dati.destinatario,
        )
        mailer.invia(messaggio)
        logger.info("mail di reset inviata, prr_id=%s", dati.prr_id)
    except Exception:
        db.rollback()
        logger.exception("invio della mail di reset fallito, prr_id=%s", dati.prr_id)
        # L'esito era stato registrato come 'email_inviata': l'audit deve dire
        # la verita'. Il token resta valido di proposito, cosi' l'utente puo'
        # ritentare e la nuova richiesta lo revochera' con la query [A].
        try:
            db.execute(
                update(PasswordResetRichiesta)
                .where(PasswordResetRichiesta.prr_id == dati.prr_id)
                .values(prr_esito=Esito.ERRORE_INVIO.value)
                .execution_options(synchronize_session=False)
            )
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("impossibile registrare l'esito errore_invio")
    finally:
        db.close()


def invia_mail_cambio_eseguito(mailer: Mailer, dati: DatiInvioCambio) -> None:
    """Notifica di avvenuto cambio.

    NON deve mai contenere la nuova password ne' un link con token: i soli
    valori disponibili sono nome, data e ora, indirizzo IP.
    """
    db = SessionLocal()
    try:
        oggetto_grezzo, corpo_grezzo = carica_template(db, CODICE_RESET_ESEGUITO)
        valori = {
            "nome": dati.nome or "utente",
            "data_ora": datetime.now(FUSO).strftime("%d/%m/%Y alle %H:%M"),
            "indirizzo_ip": spacchetta_ip(dati.ip),
        }
        messaggio = componi(
            rendi_oggetto(oggetto_grezzo, valori),
            rendi_html(corpo_grezzo, valori),
            dati.destinatario,
        )
        mailer.invia(messaggio)
        logger.info("mail di avvenuto cambio password inviata")
    except Exception:
        logger.exception("invio della mail di avvenuto cambio fallito")
    finally:
        db.close()
