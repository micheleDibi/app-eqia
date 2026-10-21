from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.gestione.validazione import email


class DatiCentro(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True, str_max_length=255)
    azienda_ragione_sociale: str = Field(min_length=1)
    azienda_partitaIVA: str = Field(pattern=r'^\d{11}$')
    azienda_codiceFiscale: str = Field(min_length=1, max_length=16)
    azienda_via: str = Field(min_length=1)
    azienda_civico: str = ''
    azienda_citta: str = Field(min_length=1)
    azienda_CAP: str = Field(pattern=r'^\d{5}$')
    azienda_provincia: str = Field(min_length=2, max_length=2)
    azienda_fatturazioneSDI: str = ''
    azienda_sitoWeb: str = ''
    azienda_email: str = ''
    azienda_telefono: str = Field(default='', max_length=45)
    azienda_pec: str = ''
    azienda_iban: str = ''
    azienda_codice_bic: str = ''
    azienda_padre_id: int | None = Field(default=None, gt=0)

    _email = field_validator('azienda_email', 'azienda_pec')(email)

    @field_validator('azienda_codiceFiscale', 'azienda_provincia', 'azienda_iban', 'azienda_codice_bic')
    @classmethod
    def maiuscolo(cls, valore):
        return valore.upper()


CAMPI_IDENTITA = ('azienda_ragione_sociale', 'azienda_partitaIVA',
                  'azienda_codiceFiscale', 'azienda_fatturazioneSDI')
CAMPI_UNIVOCI = ('azienda_partitaIVA', 'azienda_codiceFiscale', 'azienda_ragione_sociale',
                 'azienda_email', 'azienda_pec', 'azienda_telefono', 'azienda_iban')
