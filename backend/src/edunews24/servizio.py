"""Servizio EduNews24: cache, protezioni, cursori e traduzione degli errori.

Le rotte sono sincrone e girano nel threadpool condiviso da tutto il backend
(circa 40 posti, compresa /salute). Una chiamata lenta verso EduNews24 occupa
un posto per tutta la sua durata, quindi:

- un semaforo NON bloccante limita a POSTI_SEMAFORO i thread che chiamano o
  aspettano EduNews24; oltre, si risponde subito con la copia o con un 503;
- single-flight per chiave: una sola chiamata in volo, gli altri ricevono la
  copia ancora valida oppure aspettano al massimo ATTESA_VOLO_SECONDI;
- un budget globale di chiamate al minuto e una pausa dopo i rifiuti.

Il rinnovo di una copia in stale-while-revalidate e' sincrono e lo fa solo il
capo del volo: niente thread e niente BackgroundTasks. Con `memoria` si passa
da cache, normalizzazione e cursori, ma non da semaforo, budget e pausa.

Nei log solo risorsa, esito, stato HTTP e durata: mai URL, host, slug,
cursori, corpi o contatto.
"""

from __future__ import annotations

import logging
import threading
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from datetime import datetime, timezone
from urllib.parse import urlencode

from fastapi import HTTPException, status

from src.config import get_impostazioni
from src.edunews24.cache import CacheRisposte, Servito, Voce, nuova_voce, rinnova_voce
from src.edunews24.client import ClientEduNews24, ErroreEduNews24, Fonte
from src.edunews24.costanti import (
    ATTESA_VOLO_SECONDI,
    CHIAVE_CATEGORIE,
    FINESTRA_BUDGET_SECONDI,
    HOST_SITO_MEMORIA,
    MESSAGGIO_AREA,
    MESSAGGIO_CATEGORIA,
    MESSAGGIO_CURSORE,
    MESSAGGIO_NON_DISPONIBILE,
    PERCORSI,
    POSTI_SEMAFORO,
    RETRY_BREVE_SECONDI,
)
from src.edunews24.cursori import RegistroCursori
from src.edunews24.memoria import FonteMemoria
from src.edunews24.normalizza import (
    ContestoValidazione,
    PaginaNormalizzata,
    normalizza_bandi,
    normalizza_categorie,
    normalizza_notizie,
    normalizza_opportunita,
)
from src.edunews24.protezioni import OROLOGIO_SISTEMA, Budget, Orologio, Pausa, Semaforo
from src.edunews24.schemi import (
    ElencoBandi,
    ElencoCategorie,
    ElencoNotizie,
    ElencoOpportunita,
    FiltriBandi,
    FiltriInterpelli,
    FiltriNotizie,
    FiltriSelezione,
)
from src.edunews24.url import CURSORE, host_base, host_valido

logger = logging.getLogger("ersaf.edunews24")

Normalizzatore = Callable[[object], PaginaNormalizzata]


class ErroreServizio(Exception):
    """Errore verso il browser: tipo e secondi di attesa per il 503."""

    def __init__(self, tipo: str, secondi: int = RETRY_BREVE_SECONDI) -> None:
        super().__init__(tipo)
        self.tipo = tipo
        self.secondi = secondi

    def http(self) -> HTTPException:
        if self.tipo == "cursore":
            return HTTPException(status.HTTP_409_CONFLICT, MESSAGGIO_CURSORE)
        if self.tipo == "categoria":
            return HTTPException(status.HTTP_400_BAD_REQUEST, MESSAGGIO_CATEGORIA)
        if self.tipo == "area":
            return HTTPException(status.HTTP_400_BAD_REQUEST, MESSAGGIO_AREA)
        return HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, MESSAGGIO_NON_DISPONIBILE,
                             headers={"Retry-After": str(max(1, int(self.secondi)))})


@dataclass
class _Volo:
    """Una chiamata in corso su una chiave: il capo la fa, gli altri aspettano l'esito."""

    evento: threading.Event = field(default_factory=threading.Event)
    esito: Servito | None = None
    errore: Exception | None = None
    # Seguaci in attesa: serve ai test per sincronizzarsi senza sleep.
    in_attesa: int = 0


def _risorsa(percorso: str) -> str:
    return percorso.lstrip("/")


class ServizioEduNews24:
    def __init__(self, *, attiva: bool, fonte: Fonte | None, contesto: ContestoValidazione,
                 ttl_ripiego: int, stantio_massimo: int, pausa_ripiego: int, richieste_al_minuto: int,
                 orologio: Orologio = OROLOGIO_SISTEMA, attesa_volo: float = ATTESA_VOLO_SECONDI,
                 posti: int = POSTI_SEMAFORO) -> None:
        self.attiva = attiva
        self._fonte = fonte
        self._contesto = contesto
        self._ttl_ripiego = ttl_ripiego
        self._stantio_massimo = stantio_massimo
        self._pausa_ripiego = pausa_ripiego
        self._orologio = orologio
        self._attesa_volo = attesa_volo
        self._cache = CacheRisposte()
        self._cursori = RegistroCursori()
        self._semaforo = Semaforo(posti)
        self._budget = Budget(richieste_al_minuto, orologio=orologio)
        self._pausa = Pausa(pausa_ripiego, orologio=orologio)
        self._voli: dict[str, _Volo] = {}
        self._lock = threading.Lock()
        self._avviso_budget_fino = float("-inf")

    @classmethod
    def da_impostazioni(cls, imp, *, orologio: Orologio = OROLOGIO_SISTEMA,
                        trasporto=None) -> ServizioEduNews24:
        contesto = ContestoValidazione(
            host_sito=host_base(imp.edunews24_url_base) or HOST_SITO_MEMORIA,
            host_media=frozenset(h for h in imp.lista_edunews24_host_media if host_valido(h)),
        )
        fonte: Fonte | None = None
        if imp.edunews24_backend == "http":
            fonte = ClientEduNews24.da_impostazioni(imp, orologio=orologio, trasporto=trasporto)
        elif imp.edunews24_backend == "memoria":
            fonte = FonteMemoria(contesto.host_sito, orologio)
        return cls(
            attiva=fonte is not None, fonte=fonte, contesto=contesto,
            ttl_ripiego=imp.edunews24_ttl_ripiego_secondi,
            stantio_massimo=imp.edunews24_stantio_massimo_secondi,
            pausa_ripiego=imp.edunews24_pausa_ripiego_secondi,
            richieste_al_minuto=imp.edunews24_richieste_al_minuto,
            orologio=orologio,
        )

    # --- operazioni delle rotte ------------------------------------------------

    def notizie(self, filtri: FiltriNotizie) -> ElencoNotizie:
        parametri: list[tuple[str, str]] = []
        if filtri.categoria:
            parametri.append(("category", filtri.categoria))
        solo_video = filtri.solo_video == "si"
        if solo_video:
            parametri.append(("has_video", "true"))
        servito = self._elenco(
            PERCORSI["notizie"], parametri, filtri.cursore,
            lambda corpo: normalizza_notizie(corpo, self._contesto, solo_video=solo_video),
            categoria=filtri.categoria,
        )
        return ElencoNotizie(attiva=True, elementi=list(servito.pagina.elementi), meta=servito.meta())

    def interpelli(self, filtri: FiltriInterpelli) -> ElencoOpportunita:
        if filtri.area == "nazionale":
            raise ErroreServizio("area")
        parametri = [] if filtri.area == "tutte" else [("region", filtri.area)]
        servito = self._elenco(
            PERCORSI["interpelli"], parametri, filtri.cursore,
            lambda corpo: normalizza_opportunita(corpo, self._contesto, tipo="interpello"),
        )
        return ElencoOpportunita(attiva=True, elementi=list(servito.pagina.elementi), meta=servito.meta())

    def selezione(self, filtri: FiltriSelezione) -> ElencoOpportunita:
        if filtri.area == "tutte":
            parametri = []
        elif filtri.area == "nazionale":
            parametri = [("national", "true")]
        else:
            parametri = [("region", filtri.area)]
        servito = self._elenco(
            PERCORSI["selezione-personale"], parametri, filtri.cursore,
            lambda corpo: normalizza_opportunita(corpo, self._contesto, tipo="selezione-personale"),
        )
        return ElencoOpportunita(attiva=True, elementi=list(servito.pagina.elementi), meta=servito.meta())

    def bandi(self, filtri: FiltriBandi) -> ElencoBandi:
        # Con una regione a monte escono anche i bandi nazionali ed europei,
        # collegati a tutte le 20 regioni; con national=true gli europei no.
        if filtri.area == "tutte":
            parametri = []
        elif filtri.area == "nazionale":
            parametri = [("national", "true")]
        else:
            parametri = [("region", filtri.area)]
        servito = self._elenco(
            PERCORSI["bandi"], parametri, filtri.cursore,
            lambda corpo: normalizza_bandi(corpo, self._contesto),
        )
        return ElencoBandi(attiva=True, elementi=list(servito.pagina.elementi), meta=servito.meta())

    def categorie(self) -> ElencoCategorie:
        servito = self._categorie()
        return ElencoCategorie(attiva=True, elementi=list(servito.pagina.elementi), meta=servito.meta())

    # --- elenchi e cursori -----------------------------------------------------

    def _categorie(self) -> Servito:
        try:
            return self._ottieni(CHIAVE_CATEGORIE, CHIAVE_CATEGORIE, (), normalizza_categorie)
        except ErroreEduNews24:
            raise ErroreServizio("non-disponibile") from None

    def _elenco(self, percorso: str, parametri: list[tuple[str, str]], cursore: str | None,
                normalizza: Normalizzatore, categoria: str | None = None) -> Servito:
        risorsa = _risorsa(percorso)
        filtri = urlencode(parametri)
        # 1. Solo cursori emessi da noi, con gli stessi filtri: prima di
        #    qualunque chiamata, categorie comprese.
        if cursore is not None and (not CURSORE.fullmatch(cursore)
                                    or not self._cursori.emesso(percorso, filtri, cursore)):
            logger.info("richiesta EduNews24: risorsa=%s esito=cursore-sconosciuto", risorsa)
            raise ErroreServizio("cursore")
        # 2. La categoria deve esistere: le categorie si caricano prima, con le
        #    stesse protezioni; senza elenco non si puo' decidere, quindi 503.
        if categoria is not None:
            categorie = self._categorie()
            if categoria not in {c.slug for c in categorie.pagina.elementi}:
                logger.info("richiesta EduNews24: risorsa=%s esito=categoria-sconosciuta", risorsa)
                raise ErroreServizio("categoria")
        completi = tuple(parametri) + ((("cursor", cursore),) if cursore is not None else ())
        chiave = percorso + ("?" + urlencode(completi) if completi else "")
        try:
            servito = self._ottieni(chiave, percorso, completi, normalizza)
        except ErroreEduNews24 as errore:
            if errore.motivo == "cursore-rifiutato":
                if cursore is not None:
                    emittente = self._cursori.dimentica(percorso, filtri, cursore)
                    if emittente is not None:
                        # La pagina che l'ha emesso si rilegge alla prossima
                        # richiesta: dalla copia fresca tornerebbe lo stesso
                        # cursore, e la ripartenza darebbe un altro 409.
                        self._cache.scadi(emittente, self._orologio.monotono())
                self._cache.rimuovi(chiave)
                logger.info("richiesta EduNews24: risorsa=%s esito=cursore-rifiutato", risorsa)
                raise ErroreServizio("cursore") from None
            if errore.motivo == "categoria-sconosciuta":
                self._cache.scadi(CHIAVE_CATEGORIE, self._orologio.monotono())
                logger.info("richiesta EduNews24: risorsa=%s esito=categoria-sconosciuta", risorsa)
                raise ErroreServizio("categoria") from None
            raise ErroreServizio("non-disponibile", RETRY_BREVE_SECONDI) from None
        if servito.pagina.cursore_successivo is not None:
            self._cursori.registra(percorso, filtri, servito.pagina.cursore_successivo, emittente=chiave)
        return servito

    # --- cache, volo e protezioni ----------------------------------------------

    def _ottieni(self, chiave: str, percorso: str, parametri: Sequence[tuple[str, str]],
                 normalizza: Normalizzatore) -> Servito:
        risorsa = _risorsa(percorso)
        adesso = self._orologio.monotono()
        voce = self._cache.leggi(chiave)
        if voce is not None and adesso < voce.fresca_fino:
            logger.debug("richiesta EduNews24: risorsa=%s esito=fresco", risorsa)
            return voce.servito(adesso)
        if not self._fonte.remota:
            return self._aggiorna(chiave, percorso, parametri, normalizza, voce, copia=None, protetta=False)
        copia_swr = voce if voce is not None and adesso < voce.swr_fino else None
        copia = voce if voce is not None and adesso < max(voce.swr_fino, voce.sie_fino) else None
        restante = self._pausa.restante()
        if restante:
            return self._copia_o_503(copia, adesso, "pausa", restante, risorsa)
        with self._lock:
            in_volo = chiave in self._voli
        if in_volo and copia_swr is not None:
            # Seguace servito subito con la copia ancora valida, senza posto.
            return copia_swr.servito(adesso)
        if not self._semaforo.prova():
            return self._copia_o_503(copia, adesso, "occupato", RETRY_BREVE_SECONDI, risorsa)
        try:  # il posto si rilascia solo se e' stato acquisito
            with self._lock:
                volo = self._voli.get(chiave)
                capo = volo is None
                if capo:
                    volo = self._voli[chiave] = _Volo()
                else:
                    volo.in_attesa += 1
            if capo:
                return self._guida(chiave, percorso, parametri, normalizza, volo)
            return self._segui(volo, copia, risorsa)
        finally:
            self._semaforo.rilascia()

    def _segui(self, volo: _Volo, copia: Voce | None, risorsa: str) -> Servito:
        if not volo.evento.wait(self._attesa_volo):
            return self._copia_o_503(copia, self._orologio.monotono(), "attesa-scaduta",
                                     RETRY_BREVE_SECONDI, risorsa)
        errore = volo.errore
        # Una copia nuova dell'errore: lo stesso oggetto sollevato da piu'
        # thread condividerebbe il traceback.
        if isinstance(errore, ErroreServizio):
            restante = self._pausa.restante()
            raise ErroreServizio(errore.tipo, max(1, restante) if restante else errore.secondi)
        if isinstance(errore, ErroreEduNews24):
            raise ErroreEduNews24(errore.motivo, stato_http=errore.stato_http, retry_after=errore.retry_after)
        if errore is not None or volo.esito is None:
            raise ErroreServizio("non-disponibile")
        return volo.esito

    def _guida(self, chiave: str, percorso: str, parametri: Sequence[tuple[str, str]],
               normalizza: Normalizzatore, volo: _Volo) -> Servito:
        risorsa = _risorsa(percorso)
        try:
            adesso = self._orologio.monotono()
            voce = self._cache.leggi(chiave)
            if voce is not None and adesso < voce.fresca_fino:
                volo.esito = voce.servito(adesso)
                return volo.esito
            copia = voce if voce is not None and adesso < max(voce.swr_fino, voce.sie_fino) else None
            restante = self._pausa.restante()
            if restante:
                volo.esito = self._copia_o_503(copia, adesso, "pausa", restante, risorsa)
                return volo.esito
            if not self._budget.prova():
                self._avvisa_budget(adesso, risorsa)
                volo.esito = self._copia_o_503(copia, adesso, "budget",
                                               self._budget.secondi_al_prossimo(), risorsa)
                return volo.esito
            volo.esito = self._aggiorna(chiave, percorso, parametri, normalizza, voce,
                                        copia=copia, protetta=True)
            return volo.esito
        except Exception as errore:
            volo.errore = errore
            raise
        finally:
            with self._lock:
                self._voli.pop(chiave, None)
            volo.evento.set()

    def _avvisa_budget(self, adesso: float, risorsa: str) -> None:
        with self._lock:
            primo = adesso >= self._avviso_budget_fino
            if primo:
                self._avviso_budget_fino = adesso + FINESTRA_BUDGET_SECONDI
        logger.log(logging.WARNING if primo else logging.INFO,
                   "budget EduNews24 esaurito: risorsa=%s", risorsa)

    def _aggiorna(self, chiave: str, percorso: str, parametri: Sequence[tuple[str, str]],
                  normalizza: Normalizzatore, voce: Voce | None, *, copia: Voce | None,
                  protetta: bool) -> Servito:
        risorsa = _risorsa(percorso)
        inizio = self._orologio.monotono()
        try:
            risposta = self._fonte.leggi(percorso, parametri, etag=voce.etag if voce is not None else None)
            parete = self._orologio.parete()
            if risposta.stato == 304:
                if voce is None:
                    raise ErroreEduNews24("risposta-non-valida", stato_http=304)
                valore = voce.valore
                nuova = rinnova_voce(voce, risposta, inizio=inizio, adesso_parete=parete,
                                     ttl_ripiego=self._ttl_ripiego, stantio_massimo=self._stantio_massimo)
            else:
                valore = normalizza(risposta.corpo)
                nuova = nuova_voce(valore, risposta, inizio=inizio, adesso_parete=parete, precedente=voce,
                                   ttl_ripiego=self._ttl_ripiego, stantio_massimo=self._stantio_massimo)
        except ErroreEduNews24 as errore:
            self._registra_chiamata(risorsa, errore.motivo, errore.stato_http, inizio)
            if not protetta:
                raise errore from None
            return self._guasto_o_rifiuto(errore, copia, risorsa)
        except Exception:
            # Un'eccezione inattesa (per esempio nella normalizzazione) vale
            # come risposta non valida: copia o 503, mai un 500.
            errore = ErroreEduNews24("risposta-non-valida")
            self._registra_chiamata(risorsa, errore.motivo, None, inizio)
            if not protetta:
                raise errore from None
            return self._guasto_o_rifiuto(errore, copia, risorsa)

        self._pausa.successo()
        self._registra_chiamata(risorsa, "ok", risposta.stato, inizio)
        if valore.cursore_fuori_forma:
            logger.warning("risposta EduNews24: risorsa=%s esito=cursore-fuori-forma", risorsa)
        if valore.totali > 0 and valore.scartate == valore.totali:
            logger.warning("risposta EduNews24: risorsa=%s esito=voci-scartate voci=%d",
                           risorsa, valore.totali)
        if nuova is None:
            # no-store o private: si serve e non si salva.
            self._cache.rimuovi(chiave)
            aggiornato = None if risposta.stantia_a_monte else datetime.fromtimestamp(parete, tz=timezone.utc)
            return Servito(valore, aggiornato, risposta.stantia_a_monte)
        self._cache.salva(chiave, nuova)
        return Servito(nuova.valore, nuova.aggiornato_il, nuova.stantia_a_monte)

    def _registra_chiamata(self, risorsa: str, esito: str, stato_http: int | None, inizio: float) -> None:
        durata_ms = int(max(0.0, self._orologio.monotono() - inizio) * 1000)
        logger.info("chiamata EduNews24: risorsa=%s esito=%s stato=%s durata_ms=%d",
                    risorsa, esito, stato_http, durata_ms)

    def _guasto_o_rifiuto(self, errore: ErroreEduNews24, copia: Voce | None, risorsa: str) -> Servito:
        adesso = self._orologio.monotono()
        if errore.motivo in ("cursore-rifiutato", "categoria-sconosciuta"):
            # Errori della richiesta: niente pausa e niente copia.
            raise errore from None
        if errore.motivo == "richiesta-rifiutata":
            # Un altro 400 a monte e' una deriva del contratto, non un guasto.
            logger.warning("richiesta EduNews24 rifiutata: risorsa=%s stato=%s", risorsa, errore.stato_http)
            return self._copia_o_503(copia, adesso, "richiesta-rifiutata", self._pausa_ripiego, risorsa)
        durata = self._pausa.rifiuto(errore.retry_after)
        logger.warning("guasto EduNews24: risorsa=%s motivo=%s stato=%s pausa_s=%d",
                       risorsa, errore.motivo, errore.stato_http, durata)
        return self._copia_o_503(copia, adesso, "guasto", max(1, self._pausa.restante()), risorsa)

    def _copia_o_503(self, copia: Voce | None, adesso: float, esito: str, secondi: int,
                     risorsa: str) -> Servito:
        if copia is not None:
            logger.info("copia EduNews24 servita: risorsa=%s esito=%s", risorsa, esito)
            return copia.servito(adesso)
        logger.info("EduNews24 non disponibile: risorsa=%s esito=%s retry_after=%d",
                    risorsa, esito, max(1, int(secondi)))
        raise ErroreServizio("non-disponibile", max(1, int(secondi)))


_servizio: ServizioEduNews24 | None = None
_lock_modulo = threading.Lock()


def get_servizio() -> ServizioEduNews24:
    """Istanza unica, costruita alla prima richiesta (mai all'import)."""
    global _servizio
    with _lock_modulo:
        if _servizio is None:
            _servizio = ServizioEduNews24.da_impostazioni(get_impostazioni())
        return _servizio


def azzera_servizio() -> None:
    """Dimentica l'istanza: cache, cursori, pausa e budget ripartono da zero."""
    global _servizio
    with _lock_modulo:
        _servizio = None
