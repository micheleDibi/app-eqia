"""Dalla risposta di EduNews24 al contratto delle nostre rotte.

- Si salvano e si inoltrano solo i campi che l'interfaccia usa o che il contratto espone, validati.
- Una voce che non passa i controlli, o che solleva, si scarta da sola e si
  conta in `scartate`: la pagina resta. Solo una forma sbagliata del corpo
  (`data` non lista, `links` non oggetto) e' un guasto.
- URL, immagini e video passano da url_sicuro: l'host del sito per i link,
  gli host dei media per immagini e video. Nessun URL viene riscritto.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime
from typing import get_args

from src.edunews24.client import ErroreEduNews24
from src.edunews24.costanti import CATEGORIE_MASSIME, MIME_VIDEO, REGIONI, VOCI_LETTE_MASSIME
from src.edunews24.schemi import (
    Bando,
    CategoriaNotizie,
    MotivoDaVerificare,
    Notizia,
    Opportunita,
    RegioneOpportunita,
    VideoNotizia,
)
from src.edunews24.url import e_segnaposto, estrai_cursore, url_sicuro

ID_MASSIMO = 2**53 - 1
_SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
_ISTANTE = re.compile(
    r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})"
)
_GIORNO = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")
_SEPARATORI = {"\u2028", "\u2029"}
# Controlli bidirezionali (LRM, RLM, incorporamenti, sostituzioni e
# isolamenti): capovolgerebbero il testo che segue. ZWJ resta: serve alle emoji.
_BIDI = frozenset("\u200e\u200f\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069")
_NOMI_REGIONI = dict(REGIONI)
_ORDINE_REGIONI = {slug: posizione for posizione, (slug, _) in enumerate(REGIONI)}
_STATI = {"open": "aperto", "closed": "chiuso"}
# Stati dei bandi: mappa propria, _STATI resta quella di interpelli e selezione.
_STATI_BANDO = {"open": "aperto", "upcoming": "in-apertura", "closed": "chiuso", "suspended": "sospeso",
                "revoked": "revocato"}
# Motivi "da verificare": a monte in snake_case, qui in kebab-case. Si accetta
# solo la forma di monte.
_MOTIVI = {motivo.replace("-", "_"): motivo for motivo in get_args(MotivoDaVerificare)}
# Le 7 coppie stato e motivo ammesse (il frontend ha una frase per ciascuna):
# fuori da queste il motivo non vale.
_MOTIVI_PER_STATO = {
    "in-apertura": frozenset({"data-apertura-passata", "smentito-dalla-fonte", "previsione-scaduta",
                              "senza-conferma"}),
    "aperto": frozenset({"smentito-dalla-fonte", "termine-passato", "senza-conferma"}),
}

# Tetti dei testi, in caratteri.
TITOLO_MASSIMO = 300
SINTESI_MASSIMA = 500
ENTE_MASSIMO = 200
SEDE_MASSIMA = 120
NOME_CATEGORIA_MASSIMO = 80
CLASSE_CONCORSO_MASSIMA = 16
FIGURA_MASSIMA = 120
TIPOLOGIA_MASSIMA = 120
PROGRAMMA_MASSIMO = 200


@dataclass(frozen=True)
class ContestoValidazione:
    host_sito: str
    host_media: frozenset[str]


@dataclass(frozen=True)
class PaginaNormalizzata:
    elementi: tuple
    cursore_successivo: str | None
    cursore_fuori_forma: bool
    totali: int
    scartate: int
    # Misura per la cache: JSON delle voci piu' un margine fisso.
    byte: int


class _Scarta(Exception):
    """La voce non passa i controlli."""


def testo_pulito(valore: object, massimo: int) -> str | None:
    """Testo semplice su una riga, senza caratteri di controllo, al massimo `massimo` caratteri.

    Controlli e separatori di riga diventano spazi; i controlli
    bidirezionali e i surrogati isolati (mezza emoji: JSON valido, ma non
    serializzabile in UTF-8) si tolgono. Oltre il massimo si tronca al
    confine di parola e si aggiunge "…". Un testo vuoto, o un valore che non
    e' una stringa, da' None.
    """
    if not isinstance(valore, str):
        return None
    senza_controlli = "".join(
        " " if carattere in _SEPARATORI or unicodedata.category(carattere) == "Cc"
        else "" if carattere in _BIDI or unicodedata.category(carattere) == "Cs"
        else carattere
        for carattere in valore
    )
    testo = " ".join(senza_controlli.split())
    if not testo:
        return None
    if len(testo) <= massimo:
        return testo
    taglio = testo[: massimo - 1]
    if testo[massimo - 1] != " " and " " in taglio:
        taglio = taglio.rsplit(" ", 1)[0]
    return taglio.rstrip() + "…"


def _id(valore: object) -> int:
    if isinstance(valore, bool) or not isinstance(valore, int) or not 1 <= valore <= ID_MASSIMO:
        raise _Scarta
    return valore


def _istante(valore: object) -> str:
    if not isinstance(valore, str) or not _ISTANTE.fullmatch(valore):
        raise _Scarta
    try:
        datetime.fromisoformat(valore)
    except ValueError:
        raise _Scarta from None
    return valore


def _obbligatorio(valore: str | None) -> str:
    if valore is None:
        raise _Scarta
    return valore


def _intero_positivo(valore: object) -> int | None:
    if isinstance(valore, bool) or not isinstance(valore, int) or not 1 <= valore <= ID_MASSIMO:
        return None
    return valore


def _dizionario(valore: object) -> dict:
    return valore if isinstance(valore, dict) else {}


def _slug_regione(valore: object) -> str | None:
    """Lo slug di una regione, se il valore e' il nome o lo slug di una delle 20."""
    if not isinstance(valore, str):
        return None
    for parte in (valore, valore.split("/", 1)[0]):
        forma = re.sub(r"[^a-z0-9]+", "-", parte.strip().lower()).strip("-")
        if forma in _NOMI_REGIONI:
            return forma
    return None


def _regioni(valore: object) -> list[RegioneOpportunita]:
    trovate: set[str] = set()
    if isinstance(valore, list):
        for regione in valore:
            slug = regione.get("slug") if isinstance(regione, dict) else None
            if isinstance(slug, str) and slug in _NOMI_REGIONI:
                trovate.add(slug)
    return [RegioneOpportunita(slug=slug, nome=_NOMI_REGIONI[slug])
            for slug in sorted(trovate, key=_ORDINE_REGIONI.__getitem__)]


def _voci(corpo: object, massimo: int) -> tuple[list, object]:
    if not isinstance(corpo, dict):
        raise ErroreEduNews24("risposta-non-valida")
    dati, links = corpo.get("data"), corpo.get("links")
    if not isinstance(dati, list) or not isinstance(links, dict):
        raise ErroreEduNews24("risposta-non-valida")
    return dati[:massimo], links.get("next")


def _byte(voce) -> int:
    """Byte del JSON di una voce. Si misura dentro il try della voce: se non
    si serializza, si scarta lei sola e la pagina resta."""
    return len(voce.model_dump_json().encode())


def _pagina(elementi: list, byte_voci: int, prossimo: object, totali: int, scartate: int) -> PaginaNormalizzata:
    cursore = estrai_cursore(prossimo)
    return PaginaNormalizzata(
        elementi=tuple(elementi),
        cursore_successivo=cursore,
        cursore_fuori_forma=prossimo is not None and cursore is None,
        totali=totali,
        scartate=scartate,
        byte=byte_voci + 64,
    )


def _video(grezzo: dict, contesto: ContestoValidazione, immagine: str | None) -> VideoNotizia | None:
    url = url_sicuro(grezzo.get("url"), contesto.host_media)
    tipo = grezzo.get("mime_type")
    if url is None or tipo not in MIME_VIDEO:
        return None
    copertina = url_sicuro(grezzo.get("thumbnail_url"), contesto.host_media)
    if copertina is None or e_segnaposto(copertina):
        copertina = immagine
    return VideoNotizia(url=url, tipo_mime=tipo, copertina=copertina,
                        durata_secondi=_intero_positivo(grezzo.get("duration_seconds")))


def _notizia(voce: object, contesto: ContestoValidazione, host_sito: frozenset[str]) -> Notizia:
    if not isinstance(voce, dict) or voce.get("type") != "article":
        raise _Scarta
    categoria = _dizionario(voce.get("category"))
    slug = categoria.get("slug")
    if not isinstance(slug, str) or len(slug) > 64 or not _SLUG.fullmatch(slug):
        raise _Scarta
    immagine = url_sicuro(voce.get("image_url"), contesto.host_media)
    if immagine is not None and e_segnaposto(immagine):
        immagine = None
    # Il thumbnail_url di primo livello e' la copertina del video per mobile,
    # non una miniatura: non si usa.
    video_grezzo = voce.get("video")
    ha_video = isinstance(video_grezzo, dict)
    return Notizia(
        id=_id(voce.get("id")),
        titolo=_obbligatorio(testo_pulito(voce.get("title"), TITOLO_MASSIMO)),
        titolo_breve=testo_pulito(voce.get("title_summary"), TITOLO_MASSIMO),
        sintesi=testo_pulito(voce.get("excerpt"), SINTESI_MASSIMA)
        or testo_pulito(voce.get("summary"), SINTESI_MASSIMA),
        url=_obbligatorio(url_sicuro(voce.get("url"), host_sito)),
        pubblicato_il=_istante(voce.get("published_at")),
        categoria=CategoriaNotizie(
            slug=slug,
            nome=_obbligatorio(testo_pulito(categoria.get("name"), NOME_CATEGORIA_MASSIMO)),
        ),
        immagine=immagine,
        video=_video(video_grezzo, contesto, immagine) if ha_video else None,
        ha_video=ha_video,
    )


def normalizza_notizie(corpo: object, contesto: ContestoValidazione, *, solo_video: bool) -> PaginaNormalizzata:
    voci, prossimo = _voci(corpo, VOCI_LETTE_MASSIME)
    host_sito = frozenset({contesto.host_sito})
    elementi, visti, scartate, byte_voci = [], set(), 0, 0
    for voce in voci:
        # Il filtro a monte guarda video_url e puo' divergere dal campo video:
        # con "solo video" le voci senza video si tolgono senza contarle.
        if solo_video and isinstance(voce, dict) and not isinstance(voce.get("video"), dict):
            continue
        try:
            notizia = _notizia(voce, contesto, host_sito)
            peso = _byte(notizia)
        except Exception:
            scartate += 1
            continue
        if ("article", notizia.id) in visti:
            continue
        visti.add(("article", notizia.id))
        elementi.append(notizia)
        byte_voci += peso
    return _pagina(elementi, byte_voci, prossimo, len(voci), scartate)


def _stato(valore: object) -> str | None:
    if not isinstance(valore, str):
        return None
    return _STATI.get(valore, "altro")


def _scadenza(valore: object) -> str | None:
    if not isinstance(valore, str) or not _GIORNO.fullmatch(valore):
        return None
    try:
        date.fromisoformat(valore)
    except ValueError:
        return None
    return valore


def _primo_testo(valori: object, massimo: int, *, senza_regioni: bool = False) -> str | None:
    if not isinstance(valori, list):
        return None
    for valore in valori:
        if senza_regioni and _slug_regione(valore) is not None:
            continue
        testo = testo_pulito(valore, massimo)
        if testo is not None:
            return testo
    return None


def _opportunita(voce: object, tipo: str, host_sito: frozenset[str]) -> Opportunita:
    if not isinstance(voce, dict) or voce.get("type") != tipo:
        raise _Scarta
    dettagli = _dizionario(voce.get("details"))
    interpello = tipo == "interpello"
    if interpello:
        # Nessun ente: `details.official_title` e' il nome dell'avviso, non la
        # scuola, e a volte un testo di servizio del sito di origine.
        ente = None
        sede = (testo_pulito(dettagli.get("city"), SEDE_MASSIMA)
                or testo_pulito(dettagli.get("province"), SEDE_MASSIMA))
    else:
        ente = _primo_testo(dettagli.get("organizations"), ENTE_MASSIMO)
        sede = _primo_testo(dettagli.get("locations"), SEDE_MASSIMA, senza_regioni=True)
    return Opportunita(
        tipo=tipo,
        id=_id(voce.get("id")),
        titolo=_obbligatorio(testo_pulito(voce.get("title"), TITOLO_MASSIMO)),
        sintesi=testo_pulito(voce.get("summary"), SINTESI_MASSIMA),
        url=_obbligatorio(url_sicuro(voce.get("url"), host_sito)),
        ente=ente,
        sede=sede,
        regioni=_regioni(voce.get("regions")),
        nazionale=voce.get("national") is True,
        pubblicato_il=_istante(voce.get("published_at")),
        scadenza=None if interpello else _scadenza(voce.get("deadline_on")),
        stato=None if interpello else _stato(voce.get("status")),
        classe_concorso=(testo_pulito(dettagli.get("competition_class"), CLASSE_CONCORSO_MASSIMA)
                         if interpello else None),
        figura=None if interpello else testo_pulito(dettagli.get("position"), FIGURA_MASSIMA),
        posti=None if interpello else _intero_positivo(dettagli.get("positions_count")),
    )


def normalizza_opportunita(corpo: object, contesto: ContestoValidazione, *, tipo: str) -> PaginaNormalizzata:
    """Interpelli (`tipo="interpello"`) o selezione del personale (`"selezione-personale"`)."""
    voci, prossimo = _voci(corpo, VOCI_LETTE_MASSIME)
    host_sito = frozenset({contesto.host_sito})
    elementi, visti, scartate, byte_voci = [], set(), 0, 0
    for voce in voci:
        try:
            opportunita = _opportunita(voce, tipo, host_sito)
            peso = _byte(opportunita)
        except Exception:
            scartate += 1
            continue
        if (tipo, opportunita.id) in visti:
            continue
        visti.add((tipo, opportunita.id))
        elementi.append(opportunita)
        byte_voci += peso
    return _pagina(elementi, byte_voci, prossimo, len(voci), scartate)


def _stato_bando(valore: object) -> str | None:
    if not isinstance(valore, str):
        return None
    return _STATI_BANDO.get(valore, "altro")


def _da_verificare(valore: object, stato: str | None) -> str | None:
    """Il motivo, solo se forma la coppia ammessa con lo stato gia' normalizzato."""
    motivo = _MOTIVI.get(valore) if isinstance(valore, str) else None
    if motivo is None or motivo not in _MOTIVI_PER_STATO.get(stato, frozenset()):
        return None
    return motivo


def _bando(voce: object, host_sito: frozenset[str]) -> Bando:
    # Si leggono solo i campi del contratto: official_source, topics, sectors e
    # gli altri dettagli di monte non escono mai.
    if not isinstance(voce, dict) or voce.get("type") != "bando":
        raise _Scarta
    dettagli = _dizionario(voce.get("details"))
    stato = _stato_bando(voce.get("status"))
    return Bando(
        tipo="bando",
        id=_id(voce.get("id")),
        titolo=_obbligatorio(testo_pulito(voce.get("title"), TITOLO_MASSIMO)),
        titolo_breve=testo_pulito(dettagli.get("short_title"), TITOLO_MASSIMO),
        sintesi=testo_pulito(voce.get("summary"), SINTESI_MASSIMA),
        url=_obbligatorio(url_sicuro(voce.get("url"), host_sito)),
        ente=testo_pulito(dettagli.get("issuer"), ENTE_MASSIMO),
        regioni=_regioni(voce.get("regions")),
        nazionale=voce.get("national") is True,
        pubblicato_il=_istante(voce.get("published_at")),
        scadenza=_scadenza(voce.get("deadline_on")),
        stato=stato,
        # Giorni nella stessa forma della scadenza.
        apertura=_scadenza(dettagli.get("opens_on")),
        pubblicato_dalla_fonte=_scadenza(dettagli.get("source_published_on")),
        tipologia=testo_pulito(dettagli.get("kind"), TIPOLOGIA_MASSIMA),
        programma=testo_pulito(dettagli.get("program"), PROGRAMMA_MASSIMO),
        dotazione_euro=_intero_positivo(dettagli.get("total_amount_eur")),
        importo_massimo_euro=_intero_positivo(dettagli.get("max_amount_per_project_eur")),
        da_verificare=_da_verificare(dettagli.get("stato_da_verificare"), stato),
    )


def normalizza_bandi(corpo: object, contesto: ContestoValidazione) -> PaginaNormalizzata:
    """Bandi: funzione propria, che non passa da `_opportunita`.

    Stesso ciclo di normalizza_opportunita: scarto voce per voce, deduplica
    per (tipo, id), al massimo VOCI_LETTE_MASSIME voci.
    """
    voci, prossimo = _voci(corpo, VOCI_LETTE_MASSIME)
    host_sito = frozenset({contesto.host_sito})
    elementi, visti, scartate, byte_voci = [], set(), 0, 0
    for voce in voci:
        try:
            bando = _bando(voce, host_sito)
            peso = _byte(bando)
        except Exception:
            scartate += 1
            continue
        if ("bando", bando.id) in visti:
            continue
        visti.add(("bando", bando.id))
        elementi.append(bando)
        byte_voci += peso
    return _pagina(elementi, byte_voci, prossimo, len(voci), scartate)


def normalizza_categorie(corpo: object) -> PaginaNormalizzata:
    """Categorie delle notizie, nell'ordine dell'API. Nessun cursore."""
    voci, _ = _voci(corpo, CATEGORIE_MASSIME)
    elementi, visti, scartate, byte_voci = [], set(), 0, 0
    for voce in voci:
        try:
            if not isinstance(voce, dict):
                raise _Scarta
            slug = voce.get("slug")
            if not isinstance(slug, str) or len(slug) > 64 or not _SLUG.fullmatch(slug):
                raise _Scarta
            categoria = CategoriaNotizie(
                slug=slug, nome=_obbligatorio(testo_pulito(voce.get("name"), NOME_CATEGORIA_MASSIMO)))
            peso = _byte(categoria)
        except Exception:
            scartate += 1
            continue
        if categoria.slug in visti:
            continue
        visti.add(categoria.slug)
        elementi.append(categoria)
        byte_voci += peso
    return _pagina(elementi, byte_voci, None, len(voci), scartate)
