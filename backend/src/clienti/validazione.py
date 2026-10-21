"""Controlli sui dati di una persona: codice fiscale, indirizzi email e
scadenza del documento. Sollevano ValueError con il testo da mostrare.

Stessi controlli del gestionale di origine. Chi salva li applica solo ai
valori cambiati: un dato gia' salvato e non toccato non blocca il resto.
"""
from datetime import date
from src.clienti.codice_fiscale import valida_codice_fiscale as codice_fiscale
from src.gestione.validazione import email as valida_email

def email(valore: str, etichetta: str = "Email") -> str:
    valore = valore.strip()
    try:
        valida_email(valore)
    except ValueError:
        raise ValueError(f"{etichetta} non valida: formato non conforme.")
    return valore


def scadenza_documento(valore: date, oggi: date) -> date:
    if valore < oggi:
        raise ValueError("Il documento è scaduto: inserisci una data di scadenza valida.")
    return valore
