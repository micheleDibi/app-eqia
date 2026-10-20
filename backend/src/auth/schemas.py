"""Schemi di richiesta e risposta dell'autenticazione."""

from __future__ import annotations

import json

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    utente_username: str = Field(max_length=255)
    utente_password: str = Field(max_length=4096)


class RichiestaResetRequest(BaseModel):
    # `str` NUDA, non EmailStr. Con EmailStr un indirizzo malformato produrrebbe
    # un 422 con il dettaglio della validazione, mentre la specifica impone di
    # trattarlo come sconosciuto e rispondere 200 con lo stesso identico corpo.
    # Sarebbe il modo piu' banale di bucare l'indistinguibilita'.
    email: str


class ConfermaResetRequest(BaseModel):
    token: str
    password: str
    password_conferma: str


MESSAGGIO_GENERICO = "Se l'indirizzo è associato a un account riceverai una mail"

# Serializzato UNA VOLTA a import-time. Restituire questi byte invece di un
# dizionario garantisce che la risposta sia identica bit per bit su ogni ramo:
# stesso corpo, stesso Content-Length, nessuna differenza di codifica.
CORPO_RISPOSTA_GENERICA: bytes = json.dumps(
    {"message": MESSAGGIO_GENERICO}, ensure_ascii=False, separators=(",", ":")
).encode("utf-8")

MESSAGGIO_CREDENZIALI = "Username o password errati"
