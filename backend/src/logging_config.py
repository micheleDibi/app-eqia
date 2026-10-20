"""Configurazione del logging, con redazione dei valori sensibili.

Prima di questo modulo il backend non aveva alcun logging: c'era una sola
`print`. Qui si configura l'albero dei logger e si installa una redazione che
toglie token, impronte, hash bcrypt e indirizzi email da tutto cio' che viene
scritto.

QUATTRO DETTAGLI senza i quali la redazione sarebbe teatro:

  1. Il filtro va sugli HANDLER, non sui logger. Un filtro applicato a un
     logger vede solo i record emessi direttamente su di esso: quelli
     propagati dai figli (sqlalchemy.*, uvicorn.*) lo salterebbero.

  2. Serve ANCHE un Formatter che redige, perche' logging.Filter agisce prima
     che l'exc_info venga reso: un traceback di sqlalchemy.exc.StatementError
     contiene "[parameters: (...)]", cioe' l'impronta del token, e il filtro
     non lo vedrebbe mai.

  3. I logger di uvicorn hanno handler propri e propagate=False. Vanno
     ricondotti al root, altrimenti l'access log — che contiene
     "GET /auth/password-reset/validate?token=..." — bypassa la redazione.

  4. sqlalchemy.engine a livello INFO stampa ogni statement CON i parametri.
     Resta a WARNING, e l'engine e' creato con echo=False e
     hide_parameters=True.

La redazione e' una rete di sicurezza, non il piano: la regola per chi scrive
codice resta "non loggare mai un token, un'impronta o un indirizzo email". Nel
flusso di reset si logga prr_id / prt_id / sess_id / utente_id.
"""

from __future__ import annotations

import logging
import re
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

NOME_LOGGER = "ersaf"

# L'ORDINE CONTA, per due motivi distinti.
#   1. La regola chiave=valore viene per prima: se agisse dopo, si
#      applicherebbe a un valore GIA' sostituito (per esempio
#      "token=[TOKEN-REDATTO]") e produrrebbe output storpiato del tipo
#      "token=[REDATTO]]]". Il valore sarebbe comunque rimosso, ma il log
#      diventerebbe illeggibile proprio dove serve leggerlo.
#   2. L'hash bcrypt viene prima del pattern del token, perche' la sua parte
#      finale puo' contenere una sequenza di 43 caratteri che il pattern del
#      token scambierebbe per un token.
SOSTITUZIONI: list[tuple[re.Pattern[str], str]] = [
    # chiave=valore / chiave: valore con un nome sensibile.
    (
        re.compile(
            r"(?i)\b(password|passwd|pwd|utente_password|password_conferma"
            r"|smtp_password|pepper|token)\b(\s*[:=]\s*)"
            r"(\"[^\"]*\"|'[^']*'|[^\s,;)\}\]]+)"
        ),
        r"\1\2[REDATTO]",
    ),
    # $2b$12$ + 53 caratteri: un hash bcrypt.
    (re.compile(r"\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}"), "[BCRYPT-REDATTO]"),
    # secrets.token_urlsafe(32) produce esattamente 43 caratteri urlsafe.
    (
        re.compile(r"(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])"),
        "[TOKEN-REDATTO]",
    ),
    # SHA-256 esadecimale: prt_token_hash, sess_token_hash,
    # prr_identificativo_hash.
    (
        re.compile(r"(?<![0-9a-fA-F])[0-9a-fA-F]{64}(?![0-9a-fA-F])"),
        "[IMPRONTA-REDATTA]",
    ),
    # Indirizzi email: il requisito e' "nessuna email in chiaro nei log".
    # La correlazione si fa con prr_id.
    (
        re.compile(r"[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+"),
        "[EMAIL-REDATTA]",
    ),
]


def redigi(testo: str) -> str:
    for pattern, sostituto in SOSTITUZIONI:
        testo = pattern.sub(sostituto, testo)
    return testo


class FiltroRedazione(logging.Filter):
    """Redige il messaggio gia' interpolato. Da applicare agli handler."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            record.msg = redigi(record.getMessage())
        except Exception:
            record.msg = "[record non formattabile, redatto per sicurezza]"
        record.args = ()
        return True


class FormatterRedatto(logging.Formatter):
    """Redige la riga finale, traceback compreso.

    E' la seconda linea di difesa, e la piu' importante: il filtro non vede mai
    il testo dell'eccezione, che viene reso qui.
    """

    def format(self, record: logging.LogRecord) -> str:
        return redigi(super().format(record))


def _handler(destinazione: logging.Handler) -> logging.Handler:
    destinazione.setFormatter(
        FormatterRedatto("%(asctime)s %(levelname)-7s %(name)s: %(message)s")
    )
    destinazione.addFilter(FiltroRedazione())
    return destinazione


def configura_logging(imp) -> None:
    """Da chiamare una sola volta, come prima istruzione del lifespan.

    Non a import-time: rimuove gli handler del root, e farlo durante la
    raccolta di pytest disturberebbe caplog.
    """
    handlers: list[logging.Handler] = [_handler(logging.StreamHandler(sys.stdout))]

    percorso: Path | None = imp.percorso_log
    if percorso is not None:
        percorso.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(
            _handler(
                RotatingFileHandler(
                    percorso, maxBytes=5_000_000, backupCount=3, encoding="utf-8"
                )
            )
        )

    root = logging.getLogger()
    for vecchio in list(root.handlers):
        root.removeHandler(vecchio)
    for nuovo in handlers:
        root.addHandler(nuovo)
    root.setLevel(imp.log_level.upper())

    # Punto 3 del docstring: senza questo l'access log di uvicorn, che contiene
    # la query string di /password-reset/validate, non passa dalla redazione.
    for nome in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logger_uvicorn = logging.getLogger(nome)
        logger_uvicorn.handlers = []
        logger_uvicorn.propagate = True

    # Punto 4: a INFO stamperebbe ogni statement con i parametri.
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)

    # httpx scrive a INFO l'URL completo di ogni chiamata esterna (EduNews24,
    # Skebby); httpcore a DEBUG host e porta delle connessioni.
    for nome in ("httpx", "httpcore"):
        logging.getLogger(nome).setLevel(logging.WARNING)
