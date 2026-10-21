"""Risposta e corpo della scheda di un centro, con i nomi delle colonne di
`aziende`."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class CentroTrovato(BaseModel):
    """Il centro con la partita IVA cercata, da associare a un attuatore."""

    azienda_id: int
    azienda_ragione_sociale: str


class AttuatoreCentro(BaseModel):
    cliente_id: int
    cliente_nome: str
    cliente_cognome: str
    cliente_ruolo: int


class PermessiCentro(BaseModel):
    # Ragione sociale, partita IVA, codice fiscale e codice SDI: solo il
    # Nazionale. Sede, contatti e coordinate bancarie: chi vede il centro.
    anagrafici: bool = False


class SchedaCentro(BaseModel):
    azienda_id: int
    azienda_ragione_sociale: str
    azienda_partitaIVA: str
    azienda_codiceFiscale: Optional[str] = None
    azienda_fatturazioneSDI: Optional[str] = None
    azienda_codice_nazionale: Optional[str] = None
    azienda_via: str
    azienda_civico: Optional[str] = None
    azienda_CAP: str
    azienda_citta: str
    azienda_provincia: str
    azienda_email: Optional[str] = None
    azienda_pec: Optional[str] = None
    azienda_telefono: Optional[str] = None
    azienda_sitoWeb: Optional[str] = None
    azienda_iban: Optional[str] = None
    azienda_codice_bic: Optional[str] = None
    attuatori: List[AttuatoreCentro]
    permessi: PermessiCentro


class ModificheCentro(BaseModel):
    """Salvataggio parziale: si scrivono soltanto i campi inviati. Il codice
    nazionale non lo cambia nessuno, e un campo sconosciuto e' un errore.
    Le lunghezze sono quelle delle colonne."""

    model_config = ConfigDict(extra="forbid")

    azienda_ragione_sociale: Optional[str] = Field(None, max_length=255)
    azienda_partitaIVA: Optional[str] = Field(None, max_length=255)
    azienda_codiceFiscale: Optional[str] = Field(None, max_length=255)
    azienda_fatturazioneSDI: Optional[str] = Field(None, max_length=255)
    azienda_via: Optional[str] = Field(None, max_length=255)
    azienda_civico: Optional[str] = Field(None, max_length=255)
    azienda_CAP: Optional[str] = Field(None, max_length=45)
    azienda_citta: Optional[str] = Field(None, max_length=255)
    azienda_provincia: Optional[str] = Field(None, max_length=45)
    azienda_email: Optional[str] = Field(None, max_length=255)
    azienda_pec: Optional[str] = Field(None, max_length=255)
    azienda_telefono: Optional[str] = Field(None, max_length=45)
    azienda_sitoWeb: Optional[str] = Field(None, max_length=255)
    azienda_iban: Optional[str] = Field(None, max_length=255)
    azienda_codice_bic: Optional[str] = Field(None, max_length=255)
