"""Controlli sui dati di una persona: codice fiscale, indirizzi email e
scadenza del documento. Sollevano ValueError con il testo da mostrare.

Stessi controlli del gestionale di origine. Chi salva li applica solo ai
valori cambiati: un dato gia' salvato e non toccato non blocca il resto.
"""
import re
from datetime import date

_CF_FORMATO = re.compile(r"^[A-Z]{6}[0-9A-Z]{2}[A-EHLMPR-T][0-9A-Z]{2}[A-Z][0-9A-Z]{3}[A-Z]$")
_CF_DISPARI = {
    "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21,
    "A": 1, "B": 0, "C": 5, "D": 7, "E": 9, "F": 13, "G": 15, "H": 17, "I": 19, "J": 21,
    "K": 2, "L": 4, "M": 18, "N": 20, "O": 11, "P": 3, "Q": 6, "R": 8, "S": 12, "T": 14,
    "U": 16, "V": 10, "W": 22, "X": 25, "Y": 24, "Z": 23,
}
_CF_PARI = {
    **{str(cifra): cifra for cifra in range(10)},
    **{lettera: indice for indice, lettera in enumerate("ABCDEFGHIJKLMNOPQRSTUVWXYZ")},
}
_EMAIL_FORMATO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def codice_fiscale(valore: str) -> str:
    """Struttura (omocodia compresa) e carattere di controllo ufficiale.
    Restituisce il codice in maiuscolo; nessun codice fiscale estero."""
    valore = valore.strip().upper()
    if len(valore) != 16:
        raise ValueError("Codice fiscale non valido: deve essere lungo 16 caratteri.")
    if not _CF_FORMATO.match(valore):
        raise ValueError("Codice fiscale non valido: formato non conforme.")
    somma = sum(
        (_CF_DISPARI if posizione % 2 == 0 else _CF_PARI)[carattere]
        for posizione, carattere in enumerate(valore[:15])
    )
    if chr(ord("A") + somma % 26) != valore[15]:
        raise ValueError("Codice fiscale non valido: carattere di controllo errato.")
    return valore


def email(valore: str, etichetta: str = "Email") -> str:
    valore = valore.strip()
    if not _EMAIL_FORMATO.match(valore):
        raise ValueError(f"{etichetta} non valida: formato non conforme.")
    return valore


def scadenza_documento(valore: date, oggi: date) -> date:
    if valore < oggi:
        raise ValueError("Il documento è scaduto: inserisci una data di scadenza valida.")
    return valore
