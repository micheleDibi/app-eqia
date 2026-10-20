"""Cache in memoria delle risposte normalizzate, condivisa da tutti gli utenti.

Il proxy serve la stessa copia a tutti, quindi e' una cache condivisa
(RFC 9111): conta `s-maxage` meno l'eventuale `Age`. Una copia scaduta si
riusa solo entro le estensioni della stessa risposta: `stale-while-revalidate`
mentre un'unica richiesta la rinnova, `stale-if-error` se il rinnovo fallisce.
Le risposte `no-store` e `private` non si salvano.

I tempi della voce sono sull'orologio monotono; `aggiornato_il` e' l'istante
UTC dell'ultima risposta non stantia (None per una copia STALE senza una
precedente).
"""

from __future__ import annotations

import re
import threading
from collections import OrderedDict
from dataclasses import dataclass, replace
from datetime import datetime, timezone

from src.edunews24.client import RispostaEduNews24
from src.edunews24.costanti import (
    CACHE_TOTALE_MASSIMA_BYTE,
    FRESCHEZZA_MASSIMA_SECONDI,
    FRESCHEZZA_STANTIA_SECONDI,
    SIE_MASSIMO_SECONDI,
    SWR_MASSIMO_SECONDI,
    VOCE_CACHE_MASSIMA_BYTE,
    VOCI_CACHE_MASSIME,
)
from src.edunews24.normalizza import PaginaNormalizzata
from src.edunews24.schemi import AggiornamentoEduNews24

_INTERO = re.compile(r"[0-9]{1,10}")


@dataclass(frozen=True)
class Politica:
    freschezza: float
    swr: float
    sie: float


def _direttive(cache_control: object) -> dict[str, str | None]:
    """Direttive di Cache-Control: nome in minuscolo, valore senza virgolette."""
    direttive: dict[str, str | None] = {}
    if not isinstance(cache_control, str):
        return direttive
    for parte in cache_control.split(","):
        nome, uguale, valore = parte.partition("=")
        nome = nome.strip().lower()
        if nome:
            direttive.setdefault(nome, valore.strip().strip('"') if uguale else None)
    return direttive


def _intero(valore: object) -> int | None:
    return int(valore) if isinstance(valore, str) and _INTERO.fullmatch(valore.strip()) else None


def leggi_politica(cache_control: object, age: object, *, ttl_ripiego: int, stantio_massimo: int,
                   stantia_a_monte: bool) -> Politica | None:
    """Quanto a lungo una risposta resta fresca e quanto la si puo' riusare scaduta.

    None se la risposta non si deve salvare (`no-store`, `private`).
    """
    d = _direttive(cache_control)
    if "no-store" in d or "private" in d:
        return None
    s_maxage, max_age = _intero(d.get("s-maxage")), _intero(d.get("max-age"))
    if s_maxage is not None:
        vita = s_maxage
    elif max_age is not None:
        vita = max_age
    else:
        vita = FRESCHEZZA_STANTIA_SECONDI if stantia_a_monte else ttl_ripiego
    eta = _intero(age) or 0
    fresco = min(max(0, vita - eta), FRESCHEZZA_MASSIMA_SECONDI)
    if stantia_a_monte:
        fresco = min(fresco, s_maxage if s_maxage is not None else FRESCHEZZA_STANTIA_SECONDI)
    # Una risposta gia' scaduta all'arrivo ha gia' speso parte delle finestre
    # stantie: si contano dalla fine della freschezza, non da adesso.
    gia_stantia = max(0, eta - vita)
    swr = max(0, min(_intero(d.get("stale-while-revalidate")) or 0, SWR_MASSIMO_SECONDI) - gia_stantia)
    sie = max(0, min(_intero(d.get("stale-if-error")) or 0, SIE_MASSIMO_SECONDI, stantio_massimo) - gia_stantia)
    if {"no-cache", "must-revalidate", "proxy-revalidate"} & d.keys():
        # RFC 9111 4.2.4: niente copie stantie.
        swr = sie = 0
        if "no-cache" in d:
            fresco = 0
    return Politica(fresco, swr, max(sie, 0))


@dataclass(frozen=True)
class Servito:
    """Una pagina da restituire, con i dati dell'aggiornamento."""

    pagina: PaginaNormalizzata
    aggiornato_il: datetime | None
    stantio: bool

    def meta(self) -> AggiornamentoEduNews24:
        return AggiornamentoEduNews24(
            cursore_successivo=self.pagina.cursore_successivo,
            aggiornato_il=self.aggiornato_il,
            stantio=self.stantio,
        )


@dataclass(frozen=True)
class Voce:
    valore: PaginaNormalizzata
    etag: str | None
    fresca_fino: float
    swr_fino: float
    sie_fino: float
    stantia_a_monte: bool
    aggiornato_il: datetime | None
    # Cache-Control della risposta salvata: vale ancora per un 304 che non
    # ne porta uno (RFC 9111 4.3.4).
    cache_control: str | None = None

    def stantio_a(self, adesso: float) -> bool:
        return self.stantia_a_monte or adesso >= self.swr_fino

    def servito(self, adesso: float) -> Servito:
        return Servito(self.valore, self.aggiornato_il, self.stantio_a(adesso))


def _voce(valore: PaginaNormalizzata, etag: str | None, politica: Politica, *, inizio: float,
          adesso_parete: float, precedente: Voce | None, stantia: bool, cache_control: str | None) -> Voce:
    fresca_fino = inizio + politica.freschezza
    sie_fino = fresca_fino + politica.sie
    if stantia:
        # Una copia di riserva a monte non accorcia la finestra gia' acquisita
        # e non e' un aggiornamento: resta l'istante della precedente.
        if precedente is not None:
            sie_fino = max(sie_fino, precedente.sie_fino)
            aggiornato_il = precedente.aggiornato_il
        else:
            aggiornato_il = None
    else:
        aggiornato_il = datetime.fromtimestamp(adesso_parete, tz=timezone.utc)
    return Voce(valore, etag, fresca_fino, fresca_fino + politica.swr, sie_fino, stantia, aggiornato_il,
                cache_control)


def nuova_voce(valore: PaginaNormalizzata, risposta: RispostaEduNews24, *, inizio: float,
               adesso_parete: float, precedente: Voce | None, ttl_ripiego: int,
               stantio_massimo: int) -> Voce | None:
    """La voce di una risposta 200, oppure None se non va salvata."""
    politica = leggi_politica(risposta.cache_control, risposta.age, ttl_ripiego=ttl_ripiego,
                              stantio_massimo=stantio_massimo, stantia_a_monte=risposta.stantia_a_monte)
    if politica is None:
        return None
    return _voce(valore, risposta.etag, politica, inizio=inizio, adesso_parete=adesso_parete,
                 precedente=precedente, stantia=risposta.stantia_a_monte, cache_control=risposta.cache_control)


def rinnova_voce(precedente: Voce, risposta: RispostaEduNews24, *, inizio: float,
                 adesso_parete: float, ttl_ripiego: int, stantio_massimo: int) -> Voce | None:
    """La voce rinnovata da un 304: stesso valore, tempi dalle intestazioni del 304.

    Un 304 senza Cache-Control conserva le direttive della risposta salvata.
    """
    cache_control = risposta.cache_control if risposta.cache_control is not None else precedente.cache_control
    politica = leggi_politica(cache_control, risposta.age, ttl_ripiego=ttl_ripiego,
                              stantio_massimo=stantio_massimo, stantia_a_monte=risposta.stantia_a_monte)
    if politica is None:
        return None
    return _voce(precedente.valore, risposta.etag or precedente.etag, politica, inizio=inizio,
                 adesso_parete=adesso_parete, precedente=precedente, stantia=risposta.stantia_a_monte,
                 cache_control=cache_control)


class CacheRisposte:
    """LRU limitata per numero di voci e per byte."""

    def __init__(self, voci_massime: int = VOCI_CACHE_MASSIME,
                 voce_massima_byte: int = VOCE_CACHE_MASSIMA_BYTE,
                 totale_massimo_byte: int = CACHE_TOTALE_MASSIMA_BYTE) -> None:
        self._voci: OrderedDict[str, Voce] = OrderedDict()
        self._voci_massime = voci_massime
        self._voce_massima = voce_massima_byte
        self._totale_massimo = totale_massimo_byte
        self._totale = 0
        self._lock = threading.Lock()

    def leggi(self, chiave: str) -> Voce | None:
        with self._lock:
            voce = self._voci.get(chiave)
            if voce is not None:
                self._voci.move_to_end(chiave)
            return voce

    def _togli(self, chiave: str) -> None:
        vecchia = self._voci.pop(chiave, None)
        if vecchia is not None:
            self._totale -= vecchia.valore.byte

    def salva(self, chiave: str, voce: Voce) -> bool:
        """Salva la voce; una voce troppo grande non si salva e toglie la vecchia."""
        with self._lock:
            self._togli(chiave)
            if voce.valore.byte > self._voce_massima:
                return False
            self._voci[chiave] = voce
            self._totale += voce.valore.byte
            while len(self._voci) > self._voci_massime or self._totale > self._totale_massimo:
                _, espulsa = self._voci.popitem(last=False)
                self._totale -= espulsa.valore.byte
            return chiave in self._voci

    def rimuovi(self, chiave: str) -> None:
        with self._lock:
            self._togli(chiave)

    def scadi(self, chiave: str, adesso: float) -> None:
        """Rende la voce non piu' fresca, conservando la finestra stale-if-error."""
        with self._lock:
            voce = self._voci.get(chiave)
            if voce is not None:
                self._voci[chiave] = replace(voce, fresca_fino=min(voce.fresca_fino, adesso),
                                             swr_fino=min(voce.swr_fino, adesso))

    def svuota(self) -> None:
        with self._lock:
            self._voci.clear()
            self._totale = 0

    def dimensione(self) -> tuple[int, int]:
        """(numero di voci, byte totali)."""
        with self._lock:
            return len(self._voci), self._totale
