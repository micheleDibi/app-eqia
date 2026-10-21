from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from src.clienti.codice_fiscale import valida_codice_fiscale
from src.gestione.validazione import cellulare, email

TipoPersona = Literal['attuatore', 'sottoscrittore']


class DatiPersona(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True, str_max_length=255)
    cliente_nome: str = Field(min_length=1)
    cliente_cognome: str = Field(min_length=1)
    cliente_codice_fiscale: str = Field(min_length=16, max_length=16)
    cliente_sesso: Literal['', 'uomo', 'donna'] = ''
    cliente_dataNascita: date
    cliente_luogoNascita: str = Field(min_length=1)
    cliente_provinciaNascita: str = Field(default='', max_length=2)
    cliente_cittadinanza: str = Field(min_length=1)
    cliente_tipoDocumento: Literal['', "Carta d'identità", "Carta d'Identità", 'Passaporto', 'Patente', 'Altro'] = ''
    cliente_documento: str = Field(min_length=1, max_length=45)
    cliente_comuneRilascio: str = Field(min_length=1)
    cliente_dataRilascio: date
    cliente_dataScadenzaDocumento: date
    cliente_indirizzo: str = Field(min_length=1)
    cliente_civico: str = Field(default='', max_length=45)
    cliente_citta: str = Field(min_length=1)
    cliente_CAP: str = Field(pattern=r'^\d{5}$')
    cliente_provincia: str = Field(min_length=2, max_length=2)
    cliente_indirizzoDomicilio: str = ''
    cliente_civicoDomicilio: str = Field(default='', max_length=45)
    cliente_cittaDomicilio: str = ''
    cliente_CAPDomicilio: str = Field(default='', max_length=10)
    cliente_provinciaDomicilio: str = Field(default='', max_length=2)
    cliente_email: str = Field(min_length=1)
    cliente_cellulare: str = Field(min_length=1, max_length=45)
    cliente_telefono: str = ''
    cliente_pec: str = ''
    cliente_ruolo: int | None = Field(default=None, gt=0)
    azienda_id: int | None = Field(default=None, gt=0)
    attuatore_id: int | None = Field(default=None, gt=0)
    padre_utente_id: int | None = Field(default=None, gt=0)

    _cf = field_validator('cliente_codice_fiscale')(valida_codice_fiscale)
    _email = field_validator('cliente_email', 'cliente_pec')(email)
    _cellulare = field_validator('cliente_cellulare')(cellulare)

    @model_validator(mode='after')
    def date_coerenti(self):
        if self.cliente_dataNascita > date.today():
            raise ValueError('La data di nascita non può essere futura.')
        if self.cliente_dataScadenzaDocumento < self.cliente_dataRilascio:
            raise ValueError('La scadenza del documento precede il rilascio.')
        return self


CAMPI_PERSONA = tuple(k for k in DatiPersona.model_fields if k != 'padre_utente_id')
CAMPI_UNIVOCI = ('cliente_codice_fiscale', 'cliente_email', 'cliente_cellulare',
                 'cliente_telefono', 'cliente_pec', 'cliente_documento')
