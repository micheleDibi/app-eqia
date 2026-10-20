"""Corpi e risposte delle rotte delle notizie, con i nomi delle colonne."""

from __future__ import annotations

import re
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from src.notizie.dati import GRUPPI

# I codici dei ruoli che fanno da gruppo di destinatari (dati.GRUPPI).
Gruppo = Literal[tuple(GRUPPI)]

# Solo indirizzi web completi: niente "javascript:" o percorsi relativi nel
# link che i centri aprono.
_LINK = re.compile(r"https?://[^\s/?#]+[^\s]*", re.IGNORECASE)


class DatiNotizia(BaseModel):
    """Quello che il Nazionale compila. I testi facoltativi vuoti restano
    stringhe vuote."""

    notizia_titolo: str = Field(max_length=255)
    notizia_sottotitolo: str = Field("", max_length=1000)
    notizia_riassunto: str = Field("", max_length=2000)
    notizia_descrizione: str = Field(max_length=20000)
    notizia_url: str = Field("", max_length=2000)
    tag_id: int
    # Gli argomenti scelti, tutti della sezione; facoltativi.
    sottotag: List[int] = Field(default_factory=list, max_length=50)
    gruppi: List[Gruppo] = Field(min_length=1)

    @field_validator("notizia_titolo", "notizia_sottotitolo", "notizia_riassunto", "notizia_url", mode="before")
    @classmethod
    def _toglie_spazi(cls, valore):
        return valore.strip() if isinstance(valore, str) else valore

    # Il testo tiene gli a capo; si tolgono solo le righe vuote in cima e in fondo.
    @field_validator("notizia_descrizione", mode="before")
    @classmethod
    def _normalizza_testo(cls, valore):
        return valore.replace("\r\n", "\n").replace("\r", "\n").strip() if isinstance(valore, str) else valore

    @field_validator("notizia_titolo", "notizia_descrizione")
    @classmethod
    def _obbligatorio(cls, valore):
        if not valore:
            raise ValueError("Il campo è obbligatorio.")
        return valore

    @field_validator("notizia_url")
    @classmethod
    def _link(cls, valore):
        if valore and not _LINK.fullmatch(valore):
            raise ValueError("Il link deve essere un indirizzo completo, che comincia con https://")
        return valore

    @field_validator("gruppi", "sottotag")
    @classmethod
    def _senza_doppi(cls, valore):
        return list(dict.fromkeys(valore))


class Sottotag(BaseModel):
    tag_dettaglio_id: int
    tag_dettaglio_descrizione: str


class SottotagGestione(Sottotag):
    attivo: bool


class Categoria(BaseModel):
    """Una sezione con i suoi argomenti attivi: le scelte di modulo e filtro."""
    tag_id: int
    tag_descrizione: str
    sottotag: List[Sottotag]


class CategoriaGestione(BaseModel):
    """Una sezione nella gestione del Nazionale, anche disattivata."""
    tag_id: int
    tag_descrizione: str
    attivo: bool
    sottotag: List[SottotagGestione]


class NomeTag(BaseModel):
    """Il nome di una sezione o di un argomento nuovo."""
    nome: str = Field(max_length=255)

    @field_validator("nome", mode="before")
    @classmethod
    def _pulito(cls, valore):
        return " ".join(valore.split()) if isinstance(valore, str) else valore

    @field_validator("nome")
    @classmethod
    def _non_vuoto(cls, valore):
        if not valore:
            raise ValueError("Scrivi il nome.")
        return valore


class StatoTag(BaseModel):
    attivo: bool


class RigaNotizia(BaseModel):
    notizia_id: int
    notizia_titolo: str
    notizia_sottotitolo: Optional[str] = None
    notizia_riassunto: Optional[str] = None
    tag_id: Optional[int] = None
    tag_descrizione: Optional[str] = None
    notizia_created_at: Optional[datetime] = None
    immagine: bool
    sottotag: List[Sottotag] = Field(default_factory=list)
    # Se l'utente ha gia' aperto la notizia. La scheda e' sempre letta: aprirla
    # la segna.
    letta: bool = True


class NotizieDaLeggere(BaseModel):
    """Il numero sulla voce Notizie del menu."""
    totale: int


class AllegatoNotizia(BaseModel):
    notizia_allegato_id: int
    notizia_allegato_nome_file: str


class SchedaNotizia(RigaNotizia):
    notizia_descrizione: str
    notizia_url: Optional[str] = None
    notizia_updated_at: Optional[datetime] = None
    allegati: List[AllegatoNotizia]
    # Solo il Nazionale modifica; per lui anche i gruppi spuntati e il numero
    # dei destinatari, per gli altri una lista vuota e None.
    modificabile: bool
    gruppi: List[Gruppo]
    destinatari: Optional[int] = None
