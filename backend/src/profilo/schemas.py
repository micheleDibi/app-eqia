"""Contratto di lettura personale: elenco esplicito dei soli dati mostrati."""

from pydantic import BaseModel


class IndirizzoProfilo(BaseModel):
    indirizzo: str | None
    civico: str | None
    citta: str | None
    cap: str | None
    provincia: str | None


class ProfiloPersonale(BaseModel):
    username: str
    ruolo: str | None
    nome: str | None
    cognome: str | None
    codice_fiscale: str | None
    cittadinanza: str | None
    email: str | None
    pec: str | None
    telefono: str | None
    cellulare: str | None
    azienda: str | None
    residenza: IndirizzoProfilo
    domicilio: IndirizzoProfilo
