"""Un solo orologio — quello del database — e il pavimento temporale.

PERCHE' NON datetime.now() DI PYTHON NEI CONFRONTI
`prt_created_at`, `prr_created_at` e `sess_created_at` hanno DEFAULT
CURRENT_TIMESTAMP, cioe' l'orologio del server, e `prt_expires_at` viene
confrontato con NOW(). Mescolare i due orologi introduce uno scarto che si
manifesta nel modo peggiore possibile: con un processo in UTC e un MariaDB in
Europe/Rome, d'estate, tutti i token nascerebbero gia' scaduti — oppure non
scadrebbero mai. Con una sola sorgente l'incoerenza e' impossibile per
costruzione.
"""

from __future__ import annotations

import contextlib
import logging
import time

import anyio
from sqlalchemy import func, text
from sqlalchemy.sql.elements import ClauseElement

from src.database import engine

logger = logging.getLogger("ersaf.tempo")


def _mariadb() -> bool:
    return engine.dialect.name in ("mysql", "mariadb")


def istante_meno_ore(ore: int) -> ClauseElement:
    ore = int(ore)  # nessuna interpolazione di valori esterni
    if _mariadb():
        return text(f"NOW() - INTERVAL {ore} HOUR")
    return func.datetime(func.now(), f"-{ore} hours")


def istante_meno_minuti(minuti: int) -> ClauseElement:
    minuti = int(minuti)
    if _mariadb():
        return text(f"NOW() - INTERVAL {minuti} MINUTE")
    return func.datetime(func.now(), f"-{minuti} minutes")


def istante_piu_minuti(minuti: int) -> ClauseElement:
    minuti = int(minuti)
    if _mariadb():
        return text(f"NOW() + INTERVAL {minuti} MINUTE")
    return func.datetime(func.now(), f"+{minuti} minutes")


def istante_piu_ore(ore: int) -> ClauseElement:
    ore = int(ore)
    if _mariadb():
        return text(f"NOW() + INTERVAL {ore} HOUR")
    return func.datetime(func.now(), f"+{ore} hours")


def istante_meno_giorni(giorni: int) -> ClauseElement:
    giorni = int(giorni)
    if _mariadb():
        return text(f"NOW() - INTERVAL {giorni} DAY")
    return func.datetime(func.now(), f"-{giorni} days")


def istante_piu_giorni(giorni: int) -> ClauseElement:
    giorni = int(giorni)
    if _mariadb():
        return text(f"NOW() + INTERVAL {giorni} DAY")
    return func.datetime(func.now(), f"+{giorni} days")


def adesso() -> ClauseElement:
    return func.now()


@contextlib.asynccontextmanager
async def pavimento_temporale(budget_ms: int):
    """Rende il tempo di risposta indipendente dal ramo eseguito.

    L'indistinguibilita' non si ottiene sperando che i rami costino uguale:
    su /password-reset/request il ramo "email inviata" esegue cinque statement
    e quello "indirizzo sconosciuto" tre. Sono pochi millisecondi, ma
    sistematici, e poche decine di campioni con una mediana li separano.

    Il ritardo sta in un `finally`, quindi vale anche quando il corpo solleva:
    un 500 piu' veloce di un 200 sarebbe esso stesso l'oracolo.

    Si usa anyio.sleep e non time.sleep, e per questo gli endpoint che lo usano
    sono `async def`: esiste un solo threadpool da 40 slot condiviso da TUTTE
    le route sync dell'applicazione, e un time.sleep(0.9) ne occuperebbe uno.
    Quaranta richieste di reset concorrenti congelerebbero anche /clienti/,
    /utenti/ e /auth/login. anyio.sleep non occupa alcun thread.
    """
    inizio = time.perf_counter()
    try:
        yield
    finally:
        residuo = budget_ms / 1000.0 - (time.perf_counter() - inizio)
        if residuo > 0:
            await anyio.sleep(residuo)
        else:
            # Senza questo, il giorno in cui il database rallenta il pavimento
            # smetterebbe di proteggere e nessuno se ne accorgerebbe.
            logger.warning(
                "budget temporale superato di %d ms: la protezione sui tempi "
                "di risposta non e' piu' efficace, alza PASSWORD_RESET_BUDGET_MS "
                "o indaga il rallentamento",
                int(-residuo * 1000),
            )
