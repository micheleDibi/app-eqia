"""Backend `memoria`: dati inventati nella forma dell'API, per sviluppo e test.

Nessun contenuto reale: titoli, enti e sedi sono dichiaratamente di prova, e
gli host sono inventati (`.invalid`, piu' un solo host di terzi su
example.org). Le date sono relative all'orologio, arrotondate all'ora, cosi'
i dati restano identici per un'ora e del tutto deterministici con un orologio
fissato.

Contenuti:
- 30 notizie in 3 categorie, piu' `rubriche` vuota; immagini e video in tutte
  le varianti che la normalizzazione deve saper trattare;
- 25 interpelli e 25 annunci di selezione, con tutte le scadenze notevoli;
- 25 bandi con tutti gli stati, le 7 coppie di stato e motivo "da verificare",
  scadenze, aperture e dotazioni notevoli; 3 nazionali e 1 europeo, collegati
  a tutte le 20 regioni come a monte;
- nessuna voce in Molise, per lo stato vuoto di un'area; tra i bandi, con
  Molise escono solo i nazionali e l'europeo.

Filtri e paginazione imitano il contratto: 20 voci per pagina, cursore
`m<offset>-<impronta dei filtri>`, `links.next` assoluto.
"""

from __future__ import annotations

import hashlib
import re
from collections.abc import Sequence
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from src.edunews24.client import ErroreEduNews24, RispostaEduNews24
from src.edunews24.costanti import HOST_MEDIA_MEMORIA, PERCORSO_SEGNAPOSTO, REGIONI
from src.edunews24.protezioni import OROLOGIO_SISTEMA, Orologio

PER_PAGINA = 20
# Profili di Cache-Control del contratto: elenchi e dati statici.
PROFILO_ELENCO = "public, max-age=60, s-maxage=300, stale-while-revalidate=300, stale-if-error=86400"
PROFILO_CATEGORIE = "public, max-age=900, s-maxage=3600, stale-while-revalidate=3600, stale-if-error=86400"
HOST_TERZI = "terzi.example.org"

CATEGORIE = (("scuola", "Scuola"), ("universita", "Università"), ("concorsi", "Concorsi"),
             ("rubriche", "Rubriche"))
_PARAMETRI = {
    "/articles": ("category", "has_video", "cursor"),
    "/interpelli": ("region", "cursor"),
    "/selezione-personale": ("region", "national", "cursor"),
    "/bandi": ("region", "national", "cursor"),
    "/categories": (),
}
_RISORSE = {"/articles": "articles", "/interpelli": "interpelli",
            "/selezione-personale": "selezione-personale", "/bandi": "bandi", "/categories": "categories"}
_CURSORE = re.compile(r"m([0-9]{1,6})-([0-9a-f]{8})")
_NOMI = dict(REGIONI)
# Regioni usate dai dati: Molise resta vuoto di proposito.
_GIRO_REGIONI = ("lombardia", "lazio", "campania", "veneto", "sicilia", "piemonte", "toscana",
                 "puglia", "emilia-romagna", "sardegna", "liguria", "marche")

_LUNGO = (" con una coda descrittiva inventata che serve soltanto a mettere alla prova il troncamento"
          " dei titoli su due o tre righe, senza alcun riferimento a fatti, persone o enti reali")


def _istante(momento: datetime) -> str:
    return momento.strftime("%Y-%m-%dT%H:%M:%SZ")


def _media(percorso: str) -> str:
    return f"https://{HOST_MEDIA_MEMORIA}/{percorso}"


def _regioni(*slug: str) -> list[dict]:
    return [{"slug": s, "name": _NOMI[s]} for s in slug]


def _notizie(base: datetime, host_sito: str) -> list[dict]:
    notizie = []
    for i in range(30):
        numero = i + 1
        slug, nome = CATEGORIE[i % 3]
        titolo = f"Notizia di prova {numero}: aggiornamento inventato per la piattaforma"
        if i in (5, 11):
            titolo += _LUNGO
        if i == 17:
            titolo += _LUNGO + _LUNGO
        immagine: str | None = _media(f"immagini/notizia-{numero}.jpg")
        miniatura = None
        if i in (3, 9):
            immagine = None
        elif i == 4:
            immagine = f"https://{host_sito}{PERCORSO_SEGNAPOSTO}"
        elif i == 6:
            immagine = f"https://{HOST_TERZI}/immagini/prova.jpg"
        elif i == 8:
            immagine = f"http://{HOST_MEDIA_MEMORIA}/immagini/notizia-{numero}.jpg"
        elif i == 10:
            # Copertina del video per mobile a monte: non e' una miniatura.
            miniatura = _media(f"copertine/notizia-{numero}-mobile.jpg")
        video = None
        copertina = _media(f"copertine/notizia-{numero}.jpg")
        if i in (0, 20):
            video = {"url": _media(f"video/notizia-{numero}.mp4"), "mime_type": "video/mp4",
                     "thumbnail_url": copertina, "duration_seconds": 125 if i == 0 else 64}
        elif i == 2:
            video = {"url": _media(f"video/notizia-{numero}.mp4"), "mime_type": "video/mp4",
                     "thumbnail_url": copertina, "duration_seconds": None}
        elif i == 7:
            video = {"url": _media(f"video/notizia-{numero}.webm"), "mime_type": "video/webm",
                     "thumbnail_url": copertina, "duration_seconds": 48}
        elif i == 12:
            video = {"url": _media(f"video/notizia-{numero}.mov"), "mime_type": "video/quicktime",
                     "thumbnail_url": copertina, "duration_seconds": 30}
        elif i == 14:
            video = {"url": f"http://{HOST_MEDIA_MEMORIA}/video/notizia-{numero}.mp4",
                     "mime_type": "video/mp4", "thumbnail_url": copertina, "duration_seconds": 90}
        elif i == 22:
            video = {"url": _media(f"video/notizia-{numero}.mp4"), "mime_type": "video/mp4",
                     "thumbnail_url": f"https://{HOST_MEDIA_MEMORIA}{PERCORSO_SEGNAPOSTO}",
                     "duration_seconds": 30}
        notizie.append({
            "type": "article",
            "id": 101 + i,
            "slug": f"notizia-di-prova-{numero}",
            "url": f"https://{host_sito}/{slug}/notizia-di-prova-{numero}",
            "title": titolo,
            "title_summary": f"Titolo breve di prova {numero}" if i % 2 == 0 else None,
            "excerpt": f"Sintesi inventata della notizia {numero}." if i % 4 != 3 else None,
            "summary": f"Riassunto inventato della notizia {numero}." if i % 4 == 3 and i != 15 else None,
            "category": {"slug": slug, "name": nome, "color": "#000000",
                         "url": f"https://{host_sito}/{slug}"},
            "secondary_categories": [],
            "image_url": immagine,
            "thumbnail_url": miniatura,
            "video": video,
            "published_at": _istante(base - timedelta(hours=3 * i + 1)),
            "tags": [],
            "author": {"name": "Redazione di prova"},
            # Filtro has_video a monte: guarda il file, non il campo `video`.
            "_video_a_monte": video is not None or i == 16,
        })
    return notizie


def _interpelli(base: datetime, host_sito: str) -> list[dict]:
    interpelli = []
    for i in range(25):
        numero = i + 1
        regioni = [] if i % 5 == 4 else _regioni(_GIRO_REGIONI[i % len(_GIRO_REGIONI)])
        titolo = f"Interpello di prova {numero} per supplenze inventate"
        if i == 3:
            titolo += _LUNGO
        interpelli.append({
            "type": "interpello",
            "id": 1001 + i,
            "slug": f"interpello-di-prova-{numero}",
            "url": f"https://{host_sito}/interpelli/interpello-di-prova-{numero}",
            "title": titolo,
            "summary": f"Descrizione inventata dell'interpello {numero}." if i % 3 != 2 else None,
            "section": {"slug": "interpelli", "name": "Interpelli", "color": "#000000",
                        "url": f"https://{host_sito}/interpelli"},
            "published_at": _istante(base - timedelta(days=i, hours=2)),
            "updated_at": None,
            "deadline_on": None,
            "deadline_at": None,
            "status": None,
            "regions": regioni,
            "national": False,
            "details": {
                "official_title": f"Avviso di interpello di prova {numero}" if i != 6 else None,
                "competition_class": ("A022", "B015", None)[i % 3],
                "province": f"Provincia di prova {numero}",
                "city": f"Città di prova {numero}" if i % 2 == 0 else None,
            },
        })
    return interpelli


def _selezione(base: datetime, host_sito: str) -> list[dict]:
    oggi = base.date()
    # (giorni alla scadenza oppure None, stato a monte)
    scadenze = {
        5: (0, "open"), 6: (1, "open"), 7: (3, "open"),
        8: (-1, "open"),          # scaduta ieri, ma ancora open a monte
        9: (-5, "closed"),
        10: (None, None),         # nessuna scadenza
        11: (None, "open"),       # scadenza implausibile: solo lo stato
        18: (-12, "closed"),
    }
    selezione = []
    for i in range(25):
        numero = i + 1
        giorni, stato = scadenze.get(i, (30 + i, "open"))
        if i in (12, 13):
            regioni, nazionale = [], True
        elif i == 14:
            regioni, nazionale = _regioni("lombardia", "veneto"), True
        elif i in (15, 16):
            regioni, nazionale = _regioni("lazio", "campania", "puglia", "sicilia"), False
        elif i == 17:
            regioni, nazionale = [], False
        else:
            regioni, nazionale = _regioni(_GIRO_REGIONI[(i + 3) % len(_GIRO_REGIONI)]), False
        titolo = f"Selezione di prova {numero}: profili inventati per un ente di prova"
        if i in (2, 9):
            titolo += _LUNGO
        luoghi = [r["name"] for r in regioni] + [f"Città di prova {numero}"] if i % 4 != 1 else []
        selezione.append({
            "type": "selezione-personale",
            "id": 2001 + i,
            "slug": f"selezione-di-prova-{numero}",
            "url": f"https://{host_sito}/selezione-personale/selezione-di-prova-{numero}",
            "title": titolo,
            "summary": f"Descrizione inventata della selezione {numero}." if i % 3 != 1 else None,
            "section": {"slug": "selezione-personale", "name": "Selezione personale", "color": "#000000",
                        "url": f"https://{host_sito}/selezione-personale"},
            "published_at": _istante(base - timedelta(days=i // 2, hours=i + 1)),
            "updated_at": None,
            "deadline_on": None if giorni is None else (oggi + timedelta(days=giorni)).isoformat(),
            "deadline_at": None,
            "status": stato,
            "regions": regioni,
            "national": nazionale,
            "details": {
                "official_title": f"Avviso di prova {numero}",
                "code": None,
                "position": f"Figura di prova {numero}" if i % 3 != 2 else None,
                "positions_count": (i % 5) + 1 if i % 4 != 2 else None,
                "procedure_type": None,
                "categories": [],
                "sectors": [],
                "organizations": [f"Ente di prova {numero}"] if i != 20 else [],
                "locations": luoghi,
                "salary_min": None,
                "salary_max": None,
            },
        })
    return selezione


# (stato a monte, motivo da verificare, giorni alla scadenza, giorni all'apertura,
#  area, dotazione in euro). Area: "nazionale", "europeo" o le regioni del bando.
# Un motivo con "open" ha sempre la scadenza nulla, come a monte.
_BANDI = (
    ("open", None, 45, -10, "nazionale", 90_000_000),
    ("upcoming", None, 60, 6, ("lombardia",), 2_500_000),
    ("open", None, 0, -30, ("lazio", "campania"), 500_000),
    ("open", None, 1, None, ("veneto",), None),
    ("open", None, 5, -20, ("toscana",), 1_200_000),
    ("upcoming", None, 40, 0, "europeo", 0),
    ("open", "smentito_dalla_fonte", None, -15, ("piemonte",), 800_000),
    ("upcoming", "data_apertura_passata", 30, -2, ("sicilia",), 300_000),
    # Scaduto ieri ma ancora open: a monte sarebbe gia' closed. Serve a "Scaduto".
    ("open", None, -1, -40, ("puglia",), 150_000),
    ("closed", None, -5, -60, ("emilia-romagna", "liguria"), 2_000_000),
    ("suspended", None, 10, -10, ("marche",), 600_000),
    ("revoked", None, 10, -20, ("sardegna",), 400_000),
    ("open", "termine_passato", None, -50, "nazionale", 10_000_000),
    ("upcoming", "smentito_dalla_fonte", 25, 3, ("calabria",), None),
    ("closed", None, None, -90, ("abruzzo",), 700_000),
    (None, None, 20, None, ("umbria", "marche"), None),
    # Uno stato che il contratto non conosce.
    ("archived", None, 15, None, ("basilicata",), 100_000),
    ("upcoming", "previsione_scaduta", 35, -5, ("friuli-venezia-giulia",), 1_000_000),
    ("open", "senza_conferma", None, -25, ("trentino-alto-adige", "veneto"), 3_000_000),
    ("upcoming", "senza_conferma", 50, 10, ("valle-d-aosta",), 250_000),
    ("open", None, 90, -7, "nazionale", 50_000_000),
    ("open", None, 3, -14, ("lombardia", "piemonte", "liguria"), 900_000),
    ("closed", None, -12, -100, ("campania",), 350_000),
    ("open", None, 120, -3, ("lazio",), 450_000),
    ("upcoming", None, 70, 20, ("toscana", "umbria"), 1_500_000),
)
_TIPOLOGIE = ("Contributo a fondo perduto di prova", "Finanziamento agevolato di prova", "Voucher di prova", None)
_ENTE_LUNGO = " per lo sviluppo inventato dei territori, della formazione e della ricerca di prova"


def _bandi(base: datetime, host_sito: str) -> list[dict]:
    oggi = base.date()
    tutte = _regioni(*(slug for slug, _ in REGIONI))
    bandi = []
    for i, (stato, motivo, scadenza, apertura, area, dotazione) in enumerate(_BANDI):
        numero = i + 1
        if area == "nazionale":
            regioni, nazionale, ambito = tutte, True, "Nazionale"
        elif area == "europeo":
            regioni, nazionale, ambito = tutte, False, "Europea"
        else:
            regioni, nazionale, ambito = _regioni(*area), False, "Regionale"
        titolo = f"Bando di prova {numero}: contributi inventati per progetti di prova"
        if i in (4, 13):
            titolo += _LUNGO
        if i == 21:
            titolo += _LUNGO + _LUNGO
        ente = f"Ente di prova {numero}"
        if i == 2:
            ente += _ENTE_LUNGO
        elif i == 12:
            ente += _ENTE_LUNGO + _LUNGO
        elif i == 16:
            ente = None
        pubblicato = base - timedelta(days=i // 2, hours=i + 1)
        fonte = None
        if i == 4:
            # Fonte ufficiale su un host di terzi: la normalizzazione la ignora.
            fonte = {"url": f"https://{HOST_TERZI}/avvisi/bando-di-prova-{numero}", "host": HOST_TERZI,
                     "type": "institution", "verified_on": (oggi - timedelta(days=3)).isoformat()}
        bandi.append({
            "type": "bando",
            "id": 3001 + i,
            "slug": f"bando-di-prova-{numero}",
            "url": f"https://{host_sito}/bandi/bando-di-prova-{numero}",
            "title": titolo,
            "summary": f"Descrizione inventata del bando {numero}." if i % 3 != 1 else None,
            "section": {"slug": "bandi", "name": "Bandi", "color": "#000000", "url": f"https://{host_sito}/bandi"},
            "published_at": _istante(pubblicato),
            "updated_at": None,
            "deadline_on": None if scadenza is None else (oggi + timedelta(days=scadenza)).isoformat(),
            "deadline_at": None,
            "status": stato,
            "regions": regioni,
            "national": nazionale,
            "details": {
                "short_title": f"Bando breve di prova {numero}" if i % 3 != 2 and i != 3 else None,
                "issuer": ente,
                "geographic_area": ambito,
                "topics": [],
                "kind": _TIPOLOGIE[i % 4],
                "program": f"Programma di prova {i % 5 + 1}" if i % 2 == 0 else None,
                "funding_method": None,
                "sectors": [],
                "beneficiaries": [],
                "ateco_codes": [],
                "total_amount_eur": dotazione,
                "max_amount_per_project_eur": dotazione // 20 if dotazione else None,
                "opens_on": None if apertura is None else (oggi + timedelta(days=apertura)).isoformat(),
                "source_published_on": ((pubblicato.date() - timedelta(days=2)).isoformat()
                                        if i % 5 != 3 else None),
                "official_source": fonte,
                "opens_on_verified": None if apertura is None else motivo is None,
                "deadline_verified": None if scadenza is None else True,
                "last_checked_at": None,
                "stato_da_verificare": motivo,
            },
        })
    return bandi


def dati_inventati(adesso: float, host_sito: str) -> dict[str, list[dict]]:
    """Tutte le voci per risorsa, con le date relative ad `adesso` (arrotondato all'ora)."""
    base = datetime.fromtimestamp(int(adesso // 3600) * 3600, tz=timezone.utc)
    return {
        "articles": _notizie(base, host_sito),
        "interpelli": _interpelli(base, host_sito),
        "selezione-personale": _selezione(base, host_sito),
        "bandi": _bandi(base, host_sito),
        "categories": [{"slug": slug, "name": nome, "color": "#000000", "position": n,
                        "url": f"https://{host_sito}/{slug}", "secondary_categories": [],
                        "links": {}} for n, (slug, nome) in enumerate(CATEGORIE, start=1)],
    }


def _impronta(percorso: str, filtri: str) -> str:
    return hashlib.sha256(f"{percorso}|{filtri}".encode()).hexdigest()[:8]


class FonteMemoria:
    """Fonte con i dati inventati: niente rete, niente semaforo, budget o pausa."""

    remota = False

    def __init__(self, host_sito: str, orologio: Orologio = OROLOGIO_SISTEMA) -> None:
        self._host_sito = host_sito
        self._orologio = orologio

    def _base(self, percorso: str) -> str:
        return f"https://{self._host_sito}/api/v1{percorso}"

    def leggi(self, percorso: str, parametri: Sequence[tuple[str, str]],
              etag: str | None = None) -> RispostaEduNews24:
        parametri = list(parametri)
        nomi = [nome for nome, _ in parametri]
        if (percorso not in _PARAMETRI or len(set(nomi)) != len(nomi)
                or any(nome not in _PARAMETRI[percorso] for nome in nomi)):
            raise ErroreEduNews24("richiesta-rifiutata", stato_http=400)
        dati = dati_inventati(self._orologio.parete(), self._host_sito)
        if percorso == "/categories":
            corpo = {"data": dati["categories"], "meta": {"resource": "categories"},
                     "links": {"self": self._base(percorso)}}
            return RispostaEduNews24(200, corpo, None, PROFILO_CATEGORIE, None, False)

        valori = dict(parametri)
        cursore = valori.get("cursor")
        filtri = [(nome, valore) for nome, valore in parametri if nome != "cursor"]
        canonici = urlencode(filtri)
        voci = dati[_RISORSE[percorso]]
        if "category" in valori:
            if valori["category"] not in {slug for slug, _ in CATEGORIE}:
                raise ErroreEduNews24("categoria-sconosciuta", stato_http=400)
            voci = [v for v in voci if v["category"]["slug"] == valori["category"]]
        if valori.get("has_video") == "true":
            voci = [v for v in voci if v["_video_a_monte"]]
        if "region" in valori:
            voci = [v for v in voci if any(r["slug"] == valori["region"] for r in v["regions"])]
        if valori.get("national") == "true":
            voci = [v for v in voci if v["national"]]

        impronta = _impronta(percorso, canonici)
        inizio = 0
        if cursore is not None:
            trovato = _CURSORE.fullmatch(cursore)
            if trovato is None or trovato.group(2) != impronta:
                raise ErroreEduNews24("cursore-rifiutato", stato_http=400)
            inizio = int(trovato.group(1))
        pagina = voci[inizio:inizio + PER_PAGINA]
        successivo = inizio + PER_PAGINA
        prossimo = None
        if successivo < len(voci):
            prossimo = self._base(percorso) + "?" + urlencode(filtri + [("cursor", f"m{successivo}-{impronta}")])
        corpo = {
            "data": [{k: v for k, v in voce.items() if not k.startswith("_")} for voce in pagina],
            "meta": {"resource": _RISORSE[percorso], "count": len(pagina), "limit": PER_PAGINA,
                     "has_more": prossimo is not None},
            "links": {"self": self._base(percorso), "first": None, "next": prossimo},
        }
        return RispostaEduNews24(200, corpo, None, PROFILO_ELENCO, None, False)
