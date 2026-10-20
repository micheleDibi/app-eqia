"""Client HTTP verso l'API di EduNews24, sul modello di notifiche/sms.py.

- `httpx.Client` sincrono, senza redirect e senza variabili d'ambiente;
  trasporto iniettabile per i test.
- Il corpo si legge in streaming con una scadenza totale e un tetto sui byte,
  sia grezzi sia decompressi: `iter_bytes()` decomprimerebbe un blocco senza
  limite (492 byte con "gzip, gzip" diventano 200 MB), quindi si leggono i
  byte grezzi e si decomprime qui, a pezzi limitati.
- Il percorso della risorsa si concatena all'URL base: `urljoin` perderebbe
  `/v1`.
- Un errore non porta mai URL, intestazioni o corpo: si solleva
  ErroreEduNews24 con un motivo, `from None`.
"""

from __future__ import annotations

import json
import re
import zlib
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal, Protocol

import httpx

from src.edunews24.costanti import LUNGHEZZA_MASSIMA_ETAG, TETTO_BYTE, USER_AGENT, USER_AGENT_CON_CONTATTO
from src.edunews24.protezioni import OROLOGIO_SISTEMA, Orologio, leggi_retry_after

MotivoErrore = Literal[
    "rete", "tempo-scaduto", "troppo-grande", "rifiutata", "errore-server", "non-trovata",
    "risposta-non-valida", "richiesta-rifiutata", "cursore-rifiutato", "categoria-sconosciuta",
]
# Errori della richiesta, non del servizio: niente pausa e niente copia.
NON_GUASTI = frozenset({"richiesta-rifiutata", "cursore-rifiutato", "categoria-sconosciuta"})

_ETAG = re.compile(r'(?:W/)?"[\x21\x23-\x7e]*"')


class ErroreEduNews24(Exception):
    """Chiamata a EduNews24 non riuscita. Il messaggio e' sempre lo stesso."""

    def __init__(self, motivo: str, *, stato_http: int | None = None,
                 retry_after: int | None = None) -> None:
        super().__init__("Chiamata a EduNews24 non riuscita.")
        self.motivo = motivo
        self.stato_http = stato_http
        self.retry_after = retry_after

    @property
    def guasto(self) -> bool:
        return self.motivo not in NON_GUASTI


@dataclass(frozen=True)
class RispostaEduNews24:
    """Esito di una chiamata riuscita (200 o 304)."""

    stato: int
    corpo: dict | None
    etag: str | None
    cache_control: str | None
    age: str | None
    # X-EduNews24-Cache: STALE, cioe' una copia di riserva gia' a monte.
    stantia_a_monte: bool


class Fonte(Protocol):
    """Da dove arrivano le risposte: l'API (ClientEduNews24) o i dati inventati."""

    remota: bool

    def leggi(self, percorso: str, parametri: Sequence[tuple[str, str]],
              etag: str | None = None) -> RispostaEduNews24: ...


def crea_trasporto() -> httpx.BaseTransport | None:
    """Trasporto predefinito: None, cioe' quello di httpx.

    Si cerca al momento della chiamata, cosi' un test lo sostituisce con
    monkeypatch senza toccare il resto.
    """
    return None


def _leggi_corpo(risposta: httpx.Response, scadenza: float, orologio: Orologio) -> bytes:
    stato = risposta.status_code
    codifica = (risposta.headers.get("content-encoding") or "identity").strip().lower()
    if codifica not in ("identity", "gzip"):
        # Niente "gzip, gzip", deflate o br: forme che non servono e che
        # moltiplicano il lavoro di decompressione.
        raise ErroreEduNews24("risposta-non-valida", stato_http=stato)
    lunghezza = risposta.headers.get("content-length")
    if lunghezza and lunghezza.isascii() and lunghezza.isdigit() and int(lunghezza) > TETTO_BYTE:
        raise ErroreEduNews24("troppo-grande", stato_http=stato)
    decompressore = zlib.decompressobj(16 + zlib.MAX_WBITS) if codifica == "gzip" else None
    corpo = bytearray()
    grezzi = 0
    for blocco in risposta.iter_raw():
        grezzi += len(blocco)
        if grezzi > TETTO_BYTE:
            raise ErroreEduNews24("troppo-grande", stato_http=stato)
        if decompressore is None:
            corpo += blocco
        else:
            dati = blocco
            while dati:
                if decompressore.eof:
                    # Dati dopo la fine del flusso gzip.
                    raise ErroreEduNews24("risposta-non-valida", stato_http=stato)
                corpo += decompressore.decompress(dati, TETTO_BYTE + 1 - len(corpo))
                if len(corpo) > TETTO_BYTE:
                    raise ErroreEduNews24("troppo-grande", stato_http=stato)
                dati = decompressore.unconsumed_tail
        if len(corpo) > TETTO_BYTE:
            raise ErroreEduNews24("troppo-grande", stato_http=stato)
        if orologio.monotono() > scadenza:
            raise ErroreEduNews24("tempo-scaduto", stato_http=stato)
    if decompressore is not None and (not decompressore.eof or decompressore.unused_data):
        raise ErroreEduNews24("risposta-non-valida", stato_http=stato)
    return bytes(corpo)


def _tipo(risposta: httpx.Response) -> str:
    return (risposta.headers.get("content-type") or "").split(";", 1)[0].strip().lower()


def _oggetto_json(corpo: bytes, stato: int) -> dict:
    try:
        dati = json.loads(corpo)
    except (ValueError, RecursionError):
        # RecursionError: un JSON annidato troppo in profondita'.
        raise ErroreEduNews24("risposta-non-valida", stato_http=stato) from None
    if not isinstance(dati, dict):
        raise ErroreEduNews24("risposta-non-valida", stato_http=stato)
    return dati


def _etag(risposta: httpx.Response) -> str | None:
    valore = risposta.headers.get("etag")
    if valore is None or len(valore) > LUNGHEZZA_MASSIMA_ETAG or not _ETAG.fullmatch(valore):
        return None
    return valore


def _motivo_400(problema: dict) -> str:
    """Classifica un problem+json 400 (campi code ed errors[].parameter)."""
    codice = problema.get("code")
    errori = problema.get("errors")
    parametri = set()
    if isinstance(errori, list):
        parametri = {e.get("parameter") for e in errori if isinstance(e, dict)}
    if codice == "invalid-cursor" or (codice == "invalid-parameter" and "cursor" in parametri):
        return "cursore-rifiutato"
    if codice == "invalid-parameter" and "category" in parametri:
        return "categoria-sconosciuta"
    return "richiesta-rifiutata"


class ClientEduNews24:
    remota = True

    def __init__(self, url_base: str, contatto: str, *, timeout_connessione: float,
                 timeout_lettura: float, timeout_totale: float,
                 orologio: Orologio = OROLOGIO_SISTEMA,
                 trasporto: httpx.BaseTransport | None = None) -> None:
        self._base = url_base.rstrip("/")
        self._user_agent = USER_AGENT_CON_CONTATTO.format(contatto=contatto) if contatto else USER_AGENT
        self._connessione = timeout_connessione
        self._lettura = timeout_lettura
        self._totale = timeout_totale
        self._orologio = orologio
        self._trasporto = trasporto

    @classmethod
    def da_impostazioni(cls, imp, *, orologio: Orologio = OROLOGIO_SISTEMA,
                        trasporto: httpx.BaseTransport | None = None) -> ClientEduNews24:
        return cls(
            imp.edunews24_url_base, imp.edunews24_contatto,
            timeout_connessione=imp.edunews24_timeout_connessione_secondi,
            timeout_lettura=imp.edunews24_timeout_lettura_secondi,
            timeout_totale=imp.edunews24_timeout_totale_secondi,
            orologio=orologio, trasporto=trasporto,
        )

    def leggi(self, percorso: str, parametri: Sequence[tuple[str, str]],
              etag: str | None = None) -> RispostaEduNews24:
        intestazioni = {"Accept": "application/json", "Accept-Encoding": "gzip",
                        "User-Agent": self._user_agent}
        if etag:
            intestazioni["If-None-Match"] = etag
        scadenza = self._orologio.monotono() + self._totale
        tempi = httpx.Timeout(connect=self._connessione, read=self._lettura,
                              write=self._lettura, pool=self._connessione)
        trasporto = self._trasporto if self._trasporto is not None else crea_trasporto()
        try:
            with httpx.Client(timeout=tempi, follow_redirects=False, trust_env=False,
                              transport=trasporto) as client:
                with client.stream("GET", self._base + percorso, params=list(parametri),
                                   headers=intestazioni) as risposta:
                    if self._orologio.monotono() > scadenza:
                        raise ErroreEduNews24("tempo-scaduto", stato_http=risposta.status_code)
                    try:
                        return self._classifica(risposta, scadenza, etag)
                    except (ErroreEduNews24, httpx.HTTPError):
                        raise
                    except Exception:
                        # Un errore inatteso nel leggere o decodificare la
                        # risposta (per esempio un gzip corrotto) e' della
                        # risposta, non della rete.
                        raise ErroreEduNews24("risposta-non-valida",
                                              stato_http=risposta.status_code) from None
        except ErroreEduNews24 as errore:
            raise errore from None
        except httpx.TimeoutException:
            raise ErroreEduNews24("tempo-scaduto") from None
        except Exception:
            raise ErroreEduNews24("rete") from None

    def _classifica(self, risposta: httpx.Response, scadenza: float,
                    etag_inviato: str | None) -> RispostaEduNews24:
        stato = risposta.status_code
        cache_control = risposta.headers.get("cache-control")
        age = risposta.headers.get("age")
        stantia = (risposta.headers.get("x-edunews24-cache") or "").strip().upper() == "STALE"
        # Il corpo si legge solo dove serve (200 e 400): per un rifiuto o un
        # errore del server contano lo stato e Retry-After, e una pagina HTML
        # compressa in un modo non ammesso non deve nascondere Retry-After.
        if stato == 200:
            corpo = _leggi_corpo(risposta, scadenza, self._orologio)
            if _tipo(risposta) != "application/json":
                raise ErroreEduNews24("risposta-non-valida", stato_http=stato)
            dati = _oggetto_json(corpo, stato)
            return RispostaEduNews24(200, dati, _etag(risposta), cache_control, age, stantia)
        if stato == 304:
            if not etag_inviato:
                raise ErroreEduNews24("risposta-non-valida", stato_http=stato)
            return RispostaEduNews24(304, None, _etag(risposta), cache_control, age, stantia)
        if stato == 400:
            if _tipo(risposta) != "application/problem+json":
                raise ErroreEduNews24("risposta-non-valida", stato_http=stato)
            problema = _oggetto_json(_leggi_corpo(risposta, scadenza, self._orologio), stato)
            raise ErroreEduNews24(_motivo_400(problema), stato_http=stato)
        if stato == 404:
            raise ErroreEduNews24("non-trovata", stato_http=stato)
        if stato in (429, 503):
            retry_after = leggi_retry_after(risposta.headers.get("retry-after"), self._orologio.parete())
            raise ErroreEduNews24("rifiutata", stato_http=stato, retry_after=retry_after)
        if stato >= 500:
            raise ErroreEduNews24("errore-server", stato_http=stato)
        raise ErroreEduNews24("risposta-non-valida", stato_http=stato)
