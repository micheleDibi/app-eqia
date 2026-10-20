"""Registro dei cursori emessi dal backend.

Il backend accetta solo cursori che ha estratto lui da `links.next`, legati
alla risorsa e ai filtri con cui sono nati: un cursore inventato, o usato con
altri filtri, riceve un 409 senza chiamare EduNews24.
"""

from __future__ import annotations

import threading
from collections import OrderedDict

from src.edunews24.costanti import CURSORI_MASSIMI


class RegistroCursori:
    """LRU di terne (percorso, filtri canonici senza cursore, cursore).

    Per ogni terna si ricorda la chiave di cache della pagina che ha emesso il
    cursore: se EduNews24 poi lo rifiuta, quella pagina va riletta.
    """

    def __init__(self, massimo: int = CURSORI_MASSIMI) -> None:
        self._massimo = massimo
        self._terne: OrderedDict[tuple[str, str, str], str | None] = OrderedDict()
        self._lock = threading.Lock()

    def registra(self, percorso: str, filtri: str, cursore: str, emittente: str | None = None) -> None:
        terna = (percorso, filtri, cursore)
        with self._lock:
            self._terne[terna] = emittente
            self._terne.move_to_end(terna)
            while len(self._terne) > self._massimo:
                self._terne.popitem(last=False)

    def emesso(self, percorso: str, filtri: str, cursore: str) -> bool:
        terna = (percorso, filtri, cursore)
        with self._lock:
            if terna not in self._terne:
                return False
            self._terne.move_to_end(terna)
            return True

    def dimentica(self, percorso: str, filtri: str, cursore: str) -> str | None:
        """Toglie il cursore e restituisce la chiave della pagina che l'aveva emesso."""
        with self._lock:
            return self._terne.pop((percorso, filtri, cursore), None)

    def svuota(self) -> None:
        with self._lock:
            self._terne.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._terne)
