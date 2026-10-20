"""Validazione di host e URL che arrivano da EduNews24 o dalla configurazione.

Regole: solo https, nessuna credenziale, porta assente o 443, solo ASCII
stampabile, host esattamente in elenco (niente suffissi). Un URL che non passa
si scarta, non si corregge: la stringa restituita e' sempre quella originale,
e un `http` non viene mai promosso a `https`.

Tutte le espressioni regolari si applicano con fullmatch: `match` con `$`
ammetterebbe un a capo finale.
"""

from __future__ import annotations

import re
from urllib.parse import SplitResult, parse_qsl, urlsplit

from src.edunews24.costanti import LUNGHEZZA_MASSIMA_URL, PERCORSO_SEGNAPOSTO, SUFFISSI_INTERNI

# Forma dei cursori di EduNews24 (e del backend `memoria`).
CURSORE = re.compile(r"[A-Za-z0-9_-]{1,300}")

_ETICHETTA = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?")
# Un'ultima etichetta che il browser (WHATWG, "ends in a number") legge come
# numero IPv4: decimale, ottale o esadecimale, anche solo "0x".
_ETICHETTA_NUMERICA = re.compile(r"[0-9]+|0x[0-9a-f]*")
# ASCII stampabile senza spazi: esclude controlli, a capo, spazi e non ASCII.
_CARATTERI = re.compile(r"[\x21-\x7e]{1,2048}")


def host_valido(host: object) -> bool:
    """Nome di host in minuscolo, etichette DNS valide, senza punto finale."""
    return (
        isinstance(host, str)
        and 1 <= len(host) <= 253
        and not host.endswith(".")
        and all(_ETICHETTA.fullmatch(etichetta) for etichetta in host.split("."))
    )


def host_pubblico(host: object) -> bool:
    """Host valido con almeno due etichette, che non e' un IP ne' un nome interno."""
    if not host_valido(host):
        return False
    etichette = host.split(".")  # type: ignore[union-attr]
    ultima = etichette[-1]
    return len(etichette) >= 2 and not _ETICHETTA_NUMERICA.fullmatch(ultima) and ultima not in SUFFISSI_INTERNI


def _parti(valore: object) -> tuple[SplitResult, str] | None:
    """Le parti di un URL https analizzabile in sicurezza, oppure None."""
    if not isinstance(valore, str) or not _CARATTERI.fullmatch(valore):
        return None
    if any(carattere in valore for carattere in "\\[]"):
        return None
    try:
        parti = urlsplit(valore)
        porta = parti.port
    except ValueError:
        return None
    host = parti.hostname or ""
    if parti.scheme != "https" or porta not in (None, 443):
        return None
    # Il netloc deve essere solo l'host (piu' l'eventuale :443): esclude le
    # credenziali e le forme ambigue.
    if parti.netloc.lower() not in (host, f"{host}:443"):
        return None
    return parti, host


def host_base(url_base: object) -> str | None:
    """L'host di EDUNEWS24_URL_BASE, se l'indirizzo e' accettabile."""
    esito = _parti(url_base)
    if esito is None or "?" in url_base or "#" in url_base:  # type: ignore[operator]
        return None
    _, host = esito
    return host if host_pubblico(host) and not host.startswith("www.") else None


def url_sicuro(valore: object, host_ammessi: frozenset[str] | set[str]) -> str | None:
    """La stringa originale se e' un URL https su uno degli host ammessi."""
    if not isinstance(valore, str) or len(valore) > LUNGHEZZA_MASSIMA_URL:
        return None
    esito = _parti(valore)
    if esito is None:
        return None
    _, host = esito
    return valore if host_valido(host) and host in host_ammessi else None


def e_segnaposto(url: object) -> bool:
    """Vero se l'URL punta all'immagine segnaposto, su qualunque host."""
    if not isinstance(url, str):
        return False
    try:
        return urlsplit(url).path == PERCORSO_SEGNAPOSTO
    except ValueError:
        return False


def estrai_cursore(links_next: object) -> str | None:
    """Il parametro `cursor` di `links.next`, se e' uno solo e ben formato.

    `links.next` non si segue mai: se ne legge solo il cursore, e la richiesta
    successiva si ricostruisce con gli stessi filtri.
    """
    if not isinstance(links_next, str) or not _CARATTERI.fullmatch(links_next):
        return None
    try:
        query = urlsplit(links_next).query
        coppie = parse_qsl(query, keep_blank_values=True)
    except ValueError:
        return None
    valori = [valore for nome, valore in coppie if nome == "cursor"]
    if len(valori) != 1 or not CURSORE.fullmatch(valori[0]):
        return None
    return valori[0]
