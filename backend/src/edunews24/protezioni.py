"""Orologio, Retry-After, semaforo, budget e pausa delle chiamate a EduNews24.

Nessun thread e nessuno sleep: le pause si misurano sull'orologio monotono e
durante una pausa, o a budget esaurito, semplicemente non si chiama.
"""

from __future__ import annotations

import math
import re
import threading
import time
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass
from datetime import timezone
from email.utils import parsedate_to_datetime

from src.edunews24.costanti import FINESTRA_BUDGET_SECONDI, PAUSA_MASSIMA_SECONDI, POSTI_SEMAFORO

_SECONDI = re.compile(r"[0-9]{1,10}")


@dataclass(frozen=True)
class Orologio:
    """Orologio iniettabile: i test lo sostituiscono per non dormire."""

    monotono: Callable[[], float] = time.monotonic
    parete: Callable[[], float] = time.time


OROLOGIO_SISTEMA = Orologio()


def leggi_retry_after(valore: object, adesso_parete: float) -> int | None:
    """Secondi di attesa da Retry-After (secondi interi o data HTTP), fra 1 e 3600.

    None se l'intestazione manca o non e' valida: il chiamante usa allora la
    pausa di ripiego. Le cifre non ASCII non sono secondi validi.
    """
    if not isinstance(valore, str):
        return None
    testo = valore.strip()
    if _SECONDI.fullmatch(testo):
        secondi = int(testo)
    else:
        try:
            data = parsedate_to_datetime(testo)
            if data.tzinfo is None:
                data = data.replace(tzinfo=timezone.utc)
            secondi = math.ceil(data.timestamp() - adesso_parete)
        except (TypeError, ValueError, OverflowError, OSError, IndexError):
            return None
    return min(max(secondi, 1), PAUSA_MASSIMA_SECONDI)


class Semaforo:
    """Semaforo non bloccante: oltre il limite si risponde subito."""

    def __init__(self, posti: int = POSTI_SEMAFORO) -> None:
        self._semaforo = threading.BoundedSemaphore(posti)

    def prova(self) -> bool:
        return self._semaforo.acquire(blocking=False)

    def rilascia(self) -> None:
        self._semaforo.release()


class Budget:
    """Chiamate massime verso EduNews24 in una finestra scorrevole."""

    def __init__(self, massimo: int, finestra: float = FINESTRA_BUDGET_SECONDI,
                 orologio: Orologio = OROLOGIO_SISTEMA) -> None:
        self._massimo = massimo
        self._finestra = finestra
        self._orologio = orologio
        self._istanti: deque[float] = deque()
        self._lock = threading.Lock()

    def _scarta_vecchi(self, adesso: float) -> None:
        while self._istanti and self._istanti[0] <= adesso - self._finestra:
            self._istanti.popleft()

    def prova(self) -> bool:
        """Consuma un posto, se c'e'."""
        with self._lock:
            adesso = self._orologio.monotono()
            self._scarta_vecchi(adesso)
            if len(self._istanti) >= self._massimo:
                return False
            self._istanti.append(adesso)
            return True

    def secondi_al_prossimo(self) -> int:
        """Secondi prima che si liberi un posto; 1 se ce n'e' gia' uno."""
        with self._lock:
            adesso = self._orologio.monotono()
            self._scarta_vecchi(adesso)
            if len(self._istanti) < self._massimo or not self._istanti:
                return 1
            return max(1, math.ceil(self._istanti[0] + self._finestra - adesso))

    def svuota(self) -> None:
        with self._lock:
            self._istanti.clear()


class Pausa:
    """Sospensione delle chiamate dopo un rifiuto o un guasto.

    Il primo rifiuto rispetta Retry-After alla lettera; i successivi
    raddoppiano la pausa di ripiego (backoff esponenziale), senza mai scendere
    sotto il Retry-After ricevuto. La pausa non si accorcia mai e si azzera al
    primo successo.
    """

    def __init__(self, ripiego: int, orologio: Orologio = OROLOGIO_SISTEMA,
                 massimo: int = PAUSA_MASSIMA_SECONDI) -> None:
        self._ripiego = ripiego
        self._orologio = orologio
        self._massimo = massimo
        self._fino = 0.0
        self._consecutivi = 0
        self._lock = threading.Lock()

    def restante(self) -> int:
        with self._lock:
            resto = self._fino - self._orologio.monotono()
        return math.ceil(resto) if resto > 0 else 0

    def rifiuto(self, retry_after: int | None) -> int:
        """Registra un rifiuto e restituisce la durata della pausa impostata."""
        with self._lock:
            if retry_after is not None and self._consecutivi == 0:
                durata = retry_after
            else:
                passo = min(max(self._consecutivi - (1 if retry_after is not None else 0), 0), 16)
                durata = max(retry_after or 0, self._ripiego * 2 ** passo)
            durata = min(durata, self._massimo)
            self._consecutivi += 1
            self._fino = max(self._fino, self._orologio.monotono() + durata)
            return durata

    def successo(self) -> None:
        with self._lock:
            self._consecutivi = 0
