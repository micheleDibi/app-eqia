"""Risposta e corpo della scheda di sottoscrittori e attuatori, con i nomi
delle colonne di `clienti`."""

from __future__ import annotations

from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class PersonaCollegata(BaseModel):
    """Un utente citato dalla scheda (padre, autore dell'ultima modifica):
    il nome della sua anagrafica, o lo username se non ne ha una."""

    utente_id: int
    nome: str


class PadrePossibile(BaseModel):
    """Un attuatore nella finestra di scelta dell'utente padre."""

    utente_id: int
    cliente_id: int
    cliente_nome: str
    cliente_cognome: str
    cliente_ruolo: int
    centro: Optional[str] = None


class PadriPossibili(BaseModel):
    voci: List[PadrePossibile]
    # Ce ne sono altri dopo questi: la finestra li chiede scorrendo.
    altri: bool


class AccountScheda(BaseModel):
    utente_id: int
    username: str
    # Come GET /clienti/{id}/contatti: la sezione account lo tiene aggiornato.
    attivazione: Literal["attivo", "disattivato", "in_attesa"]
    creato_il: Optional[date] = None
    aggiornato_il: Optional[datetime] = None
    aggiornato_da: Optional[PersonaCollegata] = None
    padre: Optional[PersonaCollegata] = None


class CentroScheda(BaseModel):
    azienda_id: int
    ragione_sociale: str
    partita_iva: str
    codice_fiscale: Optional[str] = None
    email: Optional[str] = None
    pec: Optional[str] = None
    telefono: Optional[str] = None
    citta: str
    provincia: str
    # Chi guarda puo' aprire la scheda del centro (aziende/scheda.py).
    apribile: bool = False


class PermessiScheda(BaseModel):
    """Cosa puo' fare chi guarda, calcolato dal server: la pagina mostra
    bloccato quello che il salvataggio rifiuterebbe."""

    # Ruoli selezionabili, attuale compreso; null e' il sottoscrittore (nessun
    # ruolo di accesso). Vuoto: ruolo bloccato.
    ruoli: List[Optional[int]] = []
    stato_account: bool = False
    accedi: bool = False
    # Nome utente e utente padre: solo il Nazionale, anche sulla propria scheda.
    username: bool = False
    padre: bool = False
    # Associare, cambiare o rimuovere il centro di un attuatore.
    centro: bool = False


class SchedaAnagrafica(BaseModel):
    cliente_id: int
    tipo: Literal["attuatore", "sottoscrittore"]
    cliente_ruolo: Optional[int] = None
    cliente_codice_fiscale: Optional[str] = None
    cliente_nome: str
    cliente_cognome: str
    cliente_sesso: str
    cliente_dataNascita: date
    cliente_luogoNascita: str
    cliente_provinciaNascita: str
    cliente_cittadinanza: str
    cliente_email: str
    cliente_cellulare: Optional[str] = None
    cliente_pec: Optional[str] = None
    cliente_telefono: str
    cliente_tipoDocumento: str
    cliente_documento: str
    cliente_comuneRilascio: str
    cliente_dataRilascio: date
    cliente_dataScadenzaDocumento: date
    cliente_indirizzo: str
    cliente_civico: str
    cliente_citta: str
    cliente_CAP: str
    cliente_provincia: str
    cliente_indirizzoDomicilio: Optional[str] = None
    cliente_civicoDomicilio: Optional[str] = None
    cliente_cittaDomicilio: Optional[str] = None
    cliente_CAPDomicilio: Optional[str] = None
    cliente_provinciaDomicilio: Optional[str] = None
    account: AccountScheda
    centro: Optional[CentroScheda] = None
    # L'anagrafica ha un centro che chi guarda non vede: `centro` resta vuoto.
    centro_nascosto: bool = False
    permessi: PermessiScheda


class NuovoCentro(BaseModel):
    """Il centro da associare all'attuatore; null lo rimuove."""

    model_config = ConfigDict(extra="forbid")

    azienda_id: Optional[int]


class ModificheScheda(BaseModel):
    """Salvataggio parziale: si scrivono soltanto i campi inviati. Dell'account
    si cambiano solo nome utente e padre; il centro ha la sua rotta (NuovoCentro),
    e un campo sconosciuto e' un errore invece di un dato ignorato in silenzio.
    Le lunghezze sono quelle delle colonne."""

    model_config = ConfigDict(extra="forbid")

    utente_username: Optional[str] = Field(None, max_length=255)
    utente_padre: Optional[int] = None
    cliente_ruolo: Optional[int] = None
    cliente_codice_fiscale: Optional[str] = Field(None, max_length=20)
    cliente_nome: Optional[str] = Field(None, max_length=255)
    cliente_cognome: Optional[str] = Field(None, max_length=255)
    cliente_sesso: Optional[Literal["", "uomo", "donna"]] = None
    cliente_dataNascita: Optional[date] = None
    cliente_luogoNascita: Optional[str] = Field(None, max_length=255)
    cliente_provinciaNascita: Optional[str] = Field(None, max_length=45)
    cliente_cittadinanza: Optional[str] = Field(None, max_length=255)
    cliente_email: Optional[str] = Field(None, max_length=255)
    cliente_cellulare: Optional[str] = Field(None, max_length=45)
    cliente_pec: Optional[str] = Field(None, max_length=255)
    cliente_telefono: Optional[str] = Field(None, max_length=255)
    cliente_tipoDocumento: Optional[str] = Field(None, max_length=255)
    cliente_documento: Optional[str] = Field(None, max_length=45)
    cliente_comuneRilascio: Optional[str] = Field(None, max_length=255)
    cliente_dataRilascio: Optional[date] = None
    cliente_dataScadenzaDocumento: Optional[date] = None
    cliente_indirizzo: Optional[str] = Field(None, max_length=255)
    cliente_civico: Optional[str] = Field(None, max_length=45)
    cliente_citta: Optional[str] = Field(None, max_length=255)
    cliente_CAP: Optional[str] = Field(None, max_length=10)
    cliente_provincia: Optional[str] = Field(None, max_length=45)
    cliente_indirizzoDomicilio: Optional[str] = Field(None, max_length=255)
    cliente_civicoDomicilio: Optional[str] = Field(None, max_length=45)
    cliente_cittaDomicilio: Optional[str] = Field(None, max_length=255)
    cliente_CAPDomicilio: Optional[str] = Field(None, max_length=45)
    cliente_provinciaDomicilio: Optional[str] = Field(None, max_length=45)
