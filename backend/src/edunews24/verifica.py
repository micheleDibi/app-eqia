"""Controlli di avvio della configurazione EduNews24.

Chiamati da verifica_configurazione (config.py) con un import locale. Valgono
solo con EDUNEWS24_BACKEND=http: a funzione spenta, o con i dati inventati,
nessun controllo, cosi' il generatore dei documenti e la suite restano verdi.
I messaggi nominano la variabile e non ripetono mai il valore.
"""

from __future__ import annotations

import re

from src.edunews24.url import host_base, host_pubblico

# ASCII stampabile senza parentesi: il contatto finisce fra parentesi nello
# User-Agent, e httpx codifica le intestazioni in ASCII.
_CONTATTO = re.compile(r"[\x20-\x27\x2a-\x7e]{1,200}")


def problemi_configurazione(imp) -> list[str]:
    if imp.edunews24_backend != "http":
        return []
    problemi: list[str] = []

    if not imp.edunews24_url_base:
        problemi.append("EDUNEWS24_URL_BASE non e' impostata ma EDUNEWS24_BACKEND=http")
    elif host_base(imp.edunews24_url_base) is None:
        problemi.append(
            "EDUNEWS24_URL_BASE deve essere un indirizzo https assoluto, senza credenziali, query, "
            "frammento o porta diversa da 443, con un nome di host pubblico senza www"
        )

    # Facoltativo: vuoto, lo User-Agent resta senza contatto.
    contatto = imp.edunews24_contatto
    if contatto and (not _CONTATTO.fullmatch(contatto) or contatto != contatto.strip()):
        problemi.append(
            "EDUNEWS24_CONTATTO deve essere in ASCII stampabile, senza parentesi ne' spazi ai bordi, "
            "al massimo 200 caratteri"
        )

    if any(not host_pubblico(host) for host in imp.lista_edunews24_host_media):
        problemi.append(
            "EDUNEWS24_HOST_MEDIA contiene un host non valido: servono nomi di host pubblici, senza "
            "schema, porta, percorso o caratteri jolly"
        )

    connessione = imp.edunews24_timeout_connessione_secondi
    lettura = imp.edunews24_timeout_lettura_secondi
    intervalli = (
        ("EDUNEWS24_TIMEOUT_CONNESSIONE_SECONDI", connessione, 1, 10),
        ("EDUNEWS24_TIMEOUT_LETTURA_SECONDI", lettura, 1, 30),
        ("EDUNEWS24_TIMEOUT_TOTALE_SECONDI", imp.edunews24_timeout_totale_secondi,
         max(connessione, lettura), 30),
        ("EDUNEWS24_TTL_RIPIEGO_SECONDI", imp.edunews24_ttl_ripiego_secondi, 30, 3600),
        ("EDUNEWS24_STANTIO_MASSIMO_SECONDI", imp.edunews24_stantio_massimo_secondi, 0, 86_400),
        ("EDUNEWS24_PAUSA_RIPIEGO_SECONDI", imp.edunews24_pausa_ripiego_secondi, 1, 3600),
        # Non oltre 40: il limite a monte e' per IP e conta anche i 304.
        ("EDUNEWS24_RICHIESTE_AL_MINUTO", imp.edunews24_richieste_al_minuto, 1, 40),
    )
    for nome, valore, minimo, massimo in intervalli:
        if not minimo <= valore <= massimo:
            problemi.append(f"{nome} fuori dall'intervallo {minimo}..{massimo}")
    return problemi
