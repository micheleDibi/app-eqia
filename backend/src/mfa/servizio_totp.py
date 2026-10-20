"""Ciclo di vita dell'authenticator di un utente (tabella auth_totp).

Una sola riga per utente. Attivazione in due passi: `avvia` crea un segreto
pendente e lo mostra una volta (QR e base32); `conferma` lo attiva quando il
telefono produce il codice giusto. Un segreto pendente mai confermato viene
cancellato dall'evento della migrazione 015 dopo un giorno.
"""

from __future__ import annotations

import io

import segno
from fastapi import HTTPException
from sqlalchemy import func

from src.mfa import totp
from src.mfa.models import AuthTotp

MOTIVO_UTENTE = "utente"
MOTIVO_ADMIN = "admin"


def _attivo(riga: AuthTotp | None) -> bool:
    return riga is not None and riga.totp_attivato_il is not None and riga.totp_revocato_il is None


def stato_totp(db, utente_id: int) -> dict:
    riga = db.get(AuthTotp, utente_id)
    pendente = riga is not None and riga.totp_attivato_il is None and riga.totp_revocato_il is None
    return {
        "attivo": _attivo(riga),
        "pendente": pendente,
        "attivato_il": riga.totp_attivato_il.isoformat() if _attivo(riga) else None,
    }


def qr_svg(uri: str) -> str:
    """QR come documento SVG completo, disegnato dal server: nessuna libreria nel browser.

    Il browser lo carica come immagine (`<img src="data:image/svg+xml,...">`), e
    un SVG caricato cosi' senza `xmlns` non viene disegnato: `svg_inline` omette
    il namespace apposta, perche' pensa all'SVG incollato nell'HTML. Senza
    width e height resta il viewBox, e la misura la decide lo stile. Sfondo
    bianco pieno: le app inquadrano male i moduli su fondo trasparente.
    """
    buffer = io.BytesIO()
    segno.make(uri, error="m").save(
        buffer, kind="svg", xmldecl=False, svgns=True, nl=False, omitsize=True,
        scale=4, dark="#1e293b", light="#ffffff",
    )
    return buffer.getvalue().decode("utf-8")


def avvia_attivazione(db, utente) -> dict:
    """Segreto nuovo, pendente. Il segreto in chiaro esce da qui una volta sola."""
    riga = db.get(AuthTotp, utente.utente_id)
    if _attivo(riga):
        raise HTTPException(409, "L'authenticator è già attivo: disattivalo prima di registrarne un altro.")
    segreto = totp.genera_segreto()
    if riga is None:
        riga = AuthTotp(utente_id=utente.utente_id)
        db.add(riga)
    riga.totp_segreto = totp.cifra(segreto)
    riga.totp_attivato_il = None
    riga.totp_ultimo_passo = None
    riga.totp_revocato_il = None
    riga.totp_revocato_motivo = None
    riga.totp_creato_il = func.now()
    db.commit()
    uri = totp.uri_otpauth(segreto, utente.utente_username)
    return {"uri": uri, "segreto": totp.base32_segreto(segreto), "qr_svg": qr_svg(uri)}


def conferma_attivazione(db, utente, codice: str) -> None:
    riga = db.get(AuthTotp, utente.utente_id)
    if riga is None or riga.totp_attivato_il is not None or riga.totp_revocato_il is not None:
        raise HTTPException(409, "Nessuna attivazione in corso: ricomincia da \"Attiva\".")
    passo = totp.verifica(totp.decifra(riga.totp_segreto), codice, None)
    if passo is None:
        raise HTTPException(400, "Codice non valido: controlla l'ora del telefono e riprova.")
    riga.totp_attivato_il = func.now()
    riga.totp_ultimo_passo = passo
    db.commit()


def verifica_codice_accesso(db, utente, codice: str) -> int | None:
    """Il passo accettato per un authenticator attivo, o None. Non committa:
    il chiamante chiude la transazione insieme alla sfida e alla sessione."""
    riga = db.get(AuthTotp, utente.utente_id)
    if not _attivo(riga):
        return None
    passo = totp.verifica(totp.decifra(riga.totp_segreto), codice, riga.totp_ultimo_passo)
    if passo is not None:
        riga.totp_ultimo_passo = passo
        db.flush()
    return passo


def disattiva(db, utente, codice: str) -> None:
    riga = db.get(AuthTotp, utente.utente_id)
    if not _attivo(riga):
        raise HTTPException(409, "L'authenticator non è attivo.")
    passo = totp.verifica(totp.decifra(riga.totp_segreto), codice, riga.totp_ultimo_passo)
    if passo is None:
        raise HTTPException(400, "Codice non valido: controlla l'ora del telefono e riprova.")
    riga.totp_ultimo_passo = passo
    riga.totp_revocato_il = func.now()
    riga.totp_revocato_motivo = MOTIVO_UTENTE
    db.commit()


def azzera(db, utente_id: int, motivo: str = MOTIVO_ADMIN) -> bool:
    """Revoca senza codice: e' l'azzeramento di un amministratore. Vero se c'era qualcosa."""
    riga = db.get(AuthTotp, utente_id)
    if riga is None or riga.totp_revocato_il is not None:
        return False
    riga.totp_revocato_il = func.now()
    riga.totp_revocato_motivo = motivo
    return True
