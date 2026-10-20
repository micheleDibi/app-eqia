"""TOTP (RFC 6238) su HOTP (RFC 4226) e cifratura del segreto a riposo.

SHA-1, 6 cifre, 30 secondi: e' l'unica combinazione che tutte le app
accettano (Google Authenticator ignora le varianti). Tolleranza di un passo
in piu' e in meno per la deriva degli orologi; il chiamante conserva l'ultimo
passo accettato, e un passo gia' usato non vale piu' (anti-replay).

Il segreto a riposo e' cifrato con AES-GCM e una chiave derivata da
TOTP_CHIAVE del .env: nonce di 12 byte, testo cifrato, tag. Chi legge il
database non puo' generare codici senza la chiave. Nessuna libreria in piu':
l'algoritmo e' la standard library, la cifratura e' `cryptography`, gia' presente.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from src.config import get_impostazioni
from src.errori import ErroreConfigurazione

BYTE_SEGRETO = 20
CIFRE = 6
PASSO_SECONDI = 30
TOLLERANZA_PASSI = 1
from src.contratti import leggi_catalogo
EMITTENTE = leggi_catalogo("identita")["nome"]
_BYTE_NONCE = 12
_CONTESTO = b"ersaf-totp-v1"


def genera_segreto() -> bytes:
    return secrets.token_bytes(BYTE_SEGRETO)


def base32_segreto(segreto: bytes) -> str:
    """Come lo vuole l'app: base32 senza il riempimento `=`."""
    return base64.b32encode(segreto).decode("ascii").rstrip("=")


def uri_otpauth(segreto: bytes, account: str, emittente: str = EMITTENTE) -> str:
    etichetta = quote(f"{emittente}:{account}", safe="")
    return (
        f"otpauth://totp/{etichetta}?secret={base32_segreto(segreto)}"
        f"&issuer={quote(emittente, safe='')}&algorithm=SHA1&digits={CIFRE}&period={PASSO_SECONDI}"
    )


def passo_corrente(adesso: float | None = None) -> int:
    return int((time.time() if adesso is None else adesso) // PASSO_SECONDI)


def codice(segreto: bytes, passo: int) -> str:
    mac = hmac.new(segreto, struct.pack(">Q", passo), hashlib.sha1).digest()
    offset = mac[-1] & 0x0F
    numero = struct.unpack(">I", mac[offset:offset + 4])[0] & 0x7FFFFFFF
    return f"{numero % 10 ** CIFRE:0{CIFRE}d}"


def verifica(segreto: bytes, inserito: str, ultimo_passo: int | None, adesso: float | None = None) -> int | None:
    """Il passo accettato, o None.

    Si provano il passo corrente e quelli adiacenti, mai un passo minore o
    uguale all'ultimo accettato: il codice appena usato, o uno piu' vecchio,
    non riapre la porta. Confronti a tempo costante, e si prova ogni passo
    comunque, cosi' il tempo di risposta non dice quale sia quello buono.
    """
    # isascii: le cifre di altri alfabeti passano isdigit() ma non sono un codice.
    if len(inserito) != CIFRE or not (inserito.isascii() and inserito.isdigit()):
        return None
    centro = passo_corrente(adesso)
    accettato = None
    for passo in range(centro - TOLLERANZA_PASSI, centro + TOLLERANZA_PASSI + 1):
        valido = hmac.compare_digest(codice(segreto, passo), inserito)
        if valido and (ultimo_passo is None or passo > ultimo_passo) and accettato is None:
            accettato = passo
    return accettato


def _chiave() -> bytes:
    valore = get_impostazioni().totp_chiave
    # Come per i pepper: difesa in profondita' se il lifespan non e' girato.
    if not valore or len(valore.encode("utf-8")) < 32:
        raise ErroreConfigurazione("TOTP_CHIAVE assente o piu' corta di 32 byte: controlla backend/.env")
    return hashlib.sha256(valore.encode("utf-8")).digest()


def cifra(segreto: bytes) -> bytes:
    nonce = secrets.token_bytes(_BYTE_NONCE)
    return nonce + AESGCM(_chiave()).encrypt(nonce, segreto, _CONTESTO)


def decifra(blob: bytes) -> bytes:
    return AESGCM(_chiave()).decrypt(blob[:_BYTE_NONCE], blob[_BYTE_NONCE:], _CONTESTO)
