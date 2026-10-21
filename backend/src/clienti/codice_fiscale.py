"""Controllo del codice fiscale riusato dal gestionale di origine."""
import re

_CF_PATTERN = re.compile(
    r"^[A-Z]{6}[0-9A-Z]{2}[A-EHLMPR-T][0-9A-Z]{2}[A-Z][0-9A-Z]{3}[A-Z]$"
)

_CF_DISPARI = {
    "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21,
    "A": 1, "B": 0, "C": 5, "D": 7, "E": 9, "F": 13, "G": 15, "H": 17, "I": 19, "J": 21,
    "K": 2, "L": 4, "M": 18, "N": 20, "O": 11, "P": 3, "Q": 6, "R": 8, "S": 12, "T": 14,
    "U": 16, "V": 10, "W": 22, "X": 25, "Y": 24, "Z": 23,
}
_CF_PARI = {
    "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
    "A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5, "G": 6, "H": 7, "I": 8, "J": 9,
    "K": 10, "L": 11, "M": 12, "N": 13, "O": 14, "P": 15, "Q": 16, "R": 17, "S": 18, "T": 19,
    "U": 20, "V": 21, "W": 22, "X": 23, "Y": 24, "Z": 25,
}
_CF_RESTO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def valida_codice_fiscale(v):
    """Controllo completo, omocodia inclusa: struttura + ricalcolo del
    carattere di controllo con le tabelle ufficiali. Si assume cittadinanza
    italiana: nessuna gestione di codici fiscali esteri."""
    if v is None or v.strip() == "":
        return v
    v = v.strip().upper()

    if len(v) != 16:
        raise ValueError("Codice fiscale non valido: deve essere lungo 16 caratteri.")

    if not _CF_PATTERN.match(v):
        raise ValueError("Codice fiscale non valido: formato non conforme.")

    somma = 0
    for i, carattere in enumerate(v[:15]):
        somma += _CF_DISPARI[carattere] if i % 2 == 0 else _CF_PARI[carattere]

    atteso = _CF_RESTO[somma % 26]
    if atteso != v[15]:
        raise ValueError("Codice fiscale non valido: carattere di controllo errato.")

    return v
