"""Indirizzo IP e User-Agent del chiamante.

L'IP SI IMPACCHETTA IN PYTHON, non con INET6_ATON in SQL. I byte prodotti sono
identici — verificato: 4 per IPv4, 16 per IPv6, esattamente come la funzione di
MariaDB — quindi gli indici e le query manuali della migrazione 003 restano
validi. In cambio si ottengono tre cose:

  1. un IP non interpretabile non diventa NULL. `prr_ip` e' VARBINARY(16) NOT
     NULL e INET6_ATON('testclient') — il valore che TestClient mette in
     request.client.host — restituisce NULL: ogni richiesta di test finirebbe
     in 500 per violazione del vincolo;

  2. gli indirizzi IPv4-mapped (::ffff:1.2.3.4) si canonicalizzano nello
     STESSO contenitore di 1.2.3.4. INET6_ATON ne produrrebbe due distinti, e
     chi passa da un proxy dual-stack raddoppierebbe il proprio limite;

  3. l'IP non e' piu' un frammento di SQL interpretato dal server, ma un
     parametro binario.

DIETRO UN REVERSE PROXY non si legge X-Forwarded-For qui: si avvia uvicorn con
`--proxy-headers --forwarded-allow-ips=<ip-del-proxy>`. ProxyHeadersMiddleware
riscrive scope["client"], cosi' request.client.host resta l'unica sorgente di
verita' nel codice. Un parser di X-Forwarded-For scritto in casa e' la via
classica per farsi falsificare l'IP e aggirare il rate limit.
"""

from __future__ import annotations

import ipaddress
import logging

from fastapi import Request

logger = logging.getLogger("ersaf.rete")

# 16 byte a zero, cioe' "::". Contenitore unico per gli IP non determinabili.
IP_SCONOSCIUTO: bytes = ipaddress.ip_address("::").packed

LUNGHEZZA_MASSIMA_UA = 255


def impacchetta_ip(grezzo: str | None) -> bytes:
    if not grezzo:
        return IP_SCONOSCIUTO
    try:
        indirizzo = ipaddress.ip_address(grezzo.strip())
    except ValueError:
        return IP_SCONOSCIUTO
    if isinstance(indirizzo, ipaddress.IPv6Address) and indirizzo.ipv4_mapped:
        indirizzo = indirizzo.ipv4_mapped
    return indirizzo.packed


def spacchetta_ip(pacchetto: bytes | None) -> str:
    """Per la mail di notifica del cambio password: mai per confronti."""
    if not pacchetto or pacchetto == IP_SCONOSCIUTO:
        return "non disponibile"
    try:
        return str(ipaddress.ip_address(pacchetto))
    except ValueError:
        return "non disponibile"


def ip_client(request: Request) -> bytes:
    grezzo = request.client.host if request.client else None
    pacchetto = impacchetta_ip(grezzo)
    if pacchetto == IP_SCONOSCIUTO and grezzo not in (None, "testclient"):
        # Se questo comparisse in produzione per tutti, l'intero mondo
        # condividerebbe un unico contatore da 5/ora: e' un auto-DoS, e questo
        # warning e' l'unico modo per accorgersene.
        logger.warning(
            "indirizzo IP del chiamante non interpretabile: uso il contenitore "
            "condiviso per il rate limit"
        )
    return pacchetto


def user_agent(request: Request) -> str | None:
    valore = request.headers.get("user-agent")
    return valore[:LUNGHEZZA_MASSIMA_UA] if valore else None
