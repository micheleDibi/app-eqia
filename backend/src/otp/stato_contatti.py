"""Stato visualizzato nell'anagrafica; non sostituisce la verifica OTP di accesso."""

from src.otp.identita import versione


def stato_contatto(cliente, tipo, verifica, attivo):
    verificato_ora = verifica is not None and verifica.versione == versione(cliente, tipo)
    # Solo l'assenza di storico consente il riconoscimento dell'account legacy.
    # Una verifica di un valore precedente non certifica il contatto corrente.
    return {
        "valore": getattr(cliente, "cliente_" + tipo) or "",
        "verificato": verificato_ora or (verifica is None and attivo),
        "verificato_il": verifica.verificato.isoformat() if verificato_ora else None,
    }
