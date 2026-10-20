"""Generazione e impronta dei token opachi.

E' l'UNICO punto in cui si costruisce l'impronta di un token. La forma
    SHA-256(valore || pepper)  in esadecimale minuscolo, 64 caratteri
e' quella imposta dalle migrazioni 002 e 004 (colonne CHAR(64) ascii_bin).

PERCHE' SHA-256 E NON bcrypt: il token e' gia' 256 bit di entropia da CSPRNG,
quindi non e' attaccabile a dizionario, e un hash veloce permette la UNIQUE e
una lookup O(1) senza confronti in Python.

PERCHE' CONCATENAZIONE E NON HMAC: HMAC sarebbe la scelta da manuale, e la
differenza qui e' nulla — l'input e' sempre 43 caratteri da CSPRNG, mai a
lunghezza variabile scelta dall'attaccante, e non accettiamo mai un prefisso
controllato dall'esterno. La forma `token||pepper` e' quella documentata nella
migrazione 002. Passare a HMAC in futuro costerebbe solo lo svuotamento di
password_reset_token e auth_sessione, non una ALTER.

IL PEPPER STA IN .env E NON NEL DATABASE: chi legge un backup non puo'
derivare i token.
"""

from __future__ import annotations

import hashlib
import re
import secrets
from enum import Enum

from src.config import get_impostazioni
from src.errori import ErroreConfigurazione

# secrets.token_urlsafe(32) -> 32 byte di entropia, 43 caratteri in uscita.
BYTE_ENTROPIA = 32
LUNGHEZZA_TOKEN = 43
_RE_FORMA = re.compile(r"\A[A-Za-z0-9_-]{43}\Z")

LUNGHEZZA_IMPRONTA = 64


class TipoToken(str, Enum):
    """Distingue i due pepper. Devono essere diversi, altrimenti l'impronta di
    un token di reset e quella di un token di sessione coinciderebbero."""

    RESET = "reset"
    SESSIONE = "sessione"


def genera_token() -> str:
    return secrets.token_urlsafe(BYTE_ENTROPIA)


def _pepper(tipo: TipoToken) -> bytes:
    impostazioni = get_impostazioni()
    valore = (
        impostazioni.password_reset_token_pepper
        if tipo is TipoToken.RESET
        else impostazioni.session_token_pepper
    )
    # Difesa in profondita': se qualcuno costruisce TestClient(app) senza il
    # context manager, il lifespan non gira e verifica_configurazione() non
    # viene mai eseguita. Di qui non si passa comunque.
    if not valore or len(valore.encode("utf-8")) < 32:
        raise ErroreConfigurazione(
            f"il pepper per i token di tipo '{tipo.value}' e' assente o piu' "
            "corto di 32 byte: controlla backend/.env"
        )
    return valore.encode("utf-8")


def impronta(valore: str, tipo: TipoToken) -> str:
    """SHA-256(valore || pepper) in esadecimale minuscolo.

    Usata per i token di reset, per quelli di sessione e per l'hash
    dell'identificativo email della migrazione 003, che prescrive lo "stesso
    pepper della 002" — quindi TipoToken.RESET.
    """
    return hashlib.sha256(valore.encode("utf-8") + _pepper(tipo)).hexdigest()


def forma_token_valida(token: str | None) -> bool:
    """Scarta subito cio' che non puo' essere un nostro token.

    Evita una lookup inutile e, soprattutto, evita di far finire nei log
    stringhe arbitrarie inviate dall'esterno.
    """
    return bool(token) and _RE_FORMA.match(token) is not None


def confronta_impronte(a: str, b: str) -> bool:
    """Confronto a tempo costante.

    Nel flusso normale non serve — il confronto avviene nel WHERE, sull'indice
    UNIQUE, che e' il modo giusto. Esiste per i confronti fuori dal database.
    """
    return secrets.compare_digest(a, b)
