"""Hashing e politica delle password.

SI USA bcrypt DIRETTAMENTE, senza passlib. passlib e' fermo all'ultima release
del 2020 e si rompe con bcrypt >= 4.1 (AttributeError su __about__), quindi
imporrebbe un pin permanente; servono tre funzioni in tutto, e CryptContext
aggiunge uno strato proprio dove dobbiamo controllare *dove* avviene il
troncamento a 72 byte.

IL LIMITE DEI 72 BYTE SI RIFIUTA, NON SI TRONCA.
bcrypt ignora i byte oltre il 72esimo *senza segnalarlo*. Verificato su
bcrypt 4.3.0, la versione in requirements.txt:

    >>> h = bcrypt.hashpw(b"a"*72, bcrypt.gensalt())
    >>> bcrypt.checkpw(b"a"*73, h)
    True

cioe' due password diverse risultano uguali. L'alternativa al rifiuto sarebbe
pre-hashare con SHA-256 + base64, ma cambierebbe il formato di ogni hash
prodotto da qui in avanti e obbligherebbe ogni verifica futura a conoscere la
pre-elaborazione. Con un minimo di 12 caratteri, 72 byte non e' un limite che
qualcuno incontri per caso.
"""

from __future__ import annotations

import re
import secrets
import unicodedata
from functools import lru_cache

import bcrypt

from src.config import get_impostazioni
from src.errori import ErrorePasswordTroppoLunga

LIMITE_BYTE_BCRYPT = 72
PREFISSI_BCRYPT = ("$2a$", "$2b$", "$2y$")
_RE_COSTO = re.compile(r"^\$2[aby]\$(\d{2})\$")

ALGO_BCRYPT = "bcrypt"
ALGO_LEGACY = "legacy_plaintext"

# --- politica, allineata a NIST SP 800-63B: lunghezza, non composizione ------
# Nessun obbligo di maiuscola, cifra o simbolo. Nessuna scadenza periodica.
#
# Con un minimo di 12 caratteri, "password" e "123456" sono gia' esclusi dalla
# lunghezza: una blocklist di sole voci corte non farebbe nulla. Percio' si
# confronta anche il NUCLEO della password — le sole lettere, in minuscolo —
# contro un elenco di radici. Cosi' "Password1234!" viene rifiutata mentre
# "ErsafMontagna2026" no.
BLOCKLIST_ESATTA = frozenset(
    {
        "123456789012",
        "1234567890123",
        "123456789012345",
        "111111111111",
        "000000000000",
        "qwertyuiopas",
        "abcdefghijkl",
    }
)
RADICI_VIETATE = frozenset(
    {
        "password",
        "ersaf",
        "qwerty",
        "admin",
        "amministratore",
        "utente",
        "aderente",
        "segreto",
    }
)

# Codici restituiti da verifica_policy_password. Il frontend ne ha una copia
# speculare in frontend/src/lib/passwordPolicy.js: ogni modifica qui va
# replicata la', e backend/tests/unit/test_policy_allineata.py fallisce se le
# due divergono.
CODICI_POLICY = {
    "lunghezza_minima": "Deve avere almeno {min} caratteri",
    "lunghezza_massima_byte": (
        "Non può superare 72 byte, il limite tecnico di bcrypt "
        "(le lettere accentate ne occupano due)"
    ),
    "uguale_username": "Non può coincidere con il nome utente",
    "uguale_email": "Non può coincidere con l'indirizzo email",
    "troppo_comune": "È troppo comune o prevedibile",
}


def _prepara(password: str) -> bytes:
    """Normalizzazione NFKC applicata in modo IDENTICO da hash e verify.

    Senza, la stessa password digitata su macOS (che compone in NFD) e su
    Windows (NFC) produrrebbe due hash diversi e l'utente non riuscirebbe piu'
    ad accedere dall'altro sistema. Non si fa strip(): gli spazi iniziali e
    finali fanno parte della password.
    """
    return unicodedata.normalize("NFKC", password).encode("utf-8")


def hash_password(password: str) -> str:
    """Hash bcrypt al costo configurato. Solleva oltre i 72 byte."""
    grezza = _prepara(password)
    if len(grezza) > LIMITE_BYTE_BCRYPT:
        raise ErrorePasswordTroppoLunga(len(grezza))
    costo = get_impostazioni().bcrypt_cost
    return bcrypt.hashpw(grezza, bcrypt.gensalt(costo)).decode("ascii")


def verify_password(password: str, hash_memorizzato: str | None) -> bool:
    """Verifica. ASIMMETRIA VOLUTA rispetto a hash_password: qui non si solleva
    mai.

    Se sollevasse oltre i 72 byte, un attaccante otterrebbe un 500 mandando 73
    byte — e un 500 e' un oracolo, esattamente quello che il resto del lavoro
    serve a chiudere. Oltre il limite si restituisce False e basta.
    """
    if not hash_memorizzato:
        return False
    grezza = _prepara(password)
    if len(grezza) > LIMITE_BYTE_BCRYPT:
        return False
    try:
        return bcrypt.checkpw(grezza, hash_memorizzato.encode("ascii"))
    except (ValueError, TypeError, UnicodeEncodeError):
        # Hash malformato nel database: non e' una password valida.
        return False


def needs_rehash(hash_memorizzato: str | None) -> bool:
    """True se l'hash va rigenerato, per esempio dopo un aumento del costo."""
    if not hash_memorizzato or not hash_memorizzato.startswith(PREFISSI_BCRYPT):
        return True
    trovato = _RE_COSTO.match(hash_memorizzato)
    return trovato is None or int(trovato.group(1)) < get_impostazioni().bcrypt_cost


@lru_cache(maxsize=1)
def hash_fittizio() -> str:
    """Hash contro cui verificare quando l'utente non esiste.

    Serve a far costare il ramo "utente inesistente" quanto quello "utente
    esistente": senza, un 401 immediato direbbe all'attaccante che l'account
    non c'e'.

    Generato a runtime da 32 byte casuali e non scritto come costante nel
    sorgente, per due motivi: il costo deve coincidere con BCRYPT_COST — se
    fosse diverso, la differenza di tempo fra ramo fittizio e ramo reale
    sarebbe essa stessa l'oracolo — e il testo in chiaro non esiste da nessuna
    parte. Costa un bcrypt al primo login fallito del processo.
    """
    casuale = secrets.token_bytes(32).hex().encode("ascii")
    return bcrypt.hashpw(
        casuale, bcrypt.gensalt(get_impostazioni().bcrypt_cost)
    ).decode("ascii")


def _nucleo(password_normalizzata: str) -> str:
    """Le sole lettere, in minuscolo: "Password1234!" -> "password"."""
    return re.sub(r"[^a-z]", "", password_normalizzata)


def verifica_policy_password(
    password: str,
    *,
    username: str | None = None,
    email: str | None = None,
) -> list[str]:
    """Restituisce i codici delle regole violate, in ordine stabile.

    Lista vuota = password accettabile.
    """
    minima = get_impostazioni().password_min_length
    normalizzata = unicodedata.normalize("NFKC", password)
    violate: list[str] = []

    if len(normalizzata) < minima:
        violate.append("lunghezza_minima")
    if len(normalizzata.encode("utf-8")) > LIMITE_BYTE_BCRYPT:
        violate.append("lunghezza_massima_byte")

    piatta = normalizzata.strip().casefold()

    if username and piatta == username.strip().casefold():
        violate.append("uguale_username")
    if email:
        e = email.strip().casefold()
        # Anche la sola parte locale: chi usa "mario.rossi" come password di
        # "mario.rossi@example.org" non e' in una posizione migliore.
        if piatta == e or ("@" in e and piatta == e.split("@", 1)[0]):
            violate.append("uguale_email")

    if piatta in BLOCKLIST_ESATTA or _nucleo(piatta) in RADICI_VIETATE:
        violate.append("troppo_comune")
    elif len(set(normalizzata)) == 1:
        # "aaaaaaaaaaaa": lunga a sufficienza ma con un solo carattere.
        violate.append("troppo_comune")

    return violate


def messaggi_policy(codici: list[str]) -> list[str]:
    minima = get_impostazioni().password_min_length
    return [CODICI_POLICY[c].format(min=minima) for c in codici]
