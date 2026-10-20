"""Passkey (WebAuthn) del Nazionale: registrazione dal telefono e verifica al login.

Nel database resta solo la chiave pubblica. La challenge non si conserva: si
deriva dal token della sfida (otp_sfide) con il pepper, cosi' il server la
ricalcola quando il client restituisce il token insieme alla risposta
dell'autenticatore. Registrazione con dispositivo esterno (telefono o chiave)
e verifica dell'utente obbligatoria (impronta, volto o PIN); nessuna
attestazione richiesta, non servono certificati dei produttori.
"""

from __future__ import annotations

import json
import secrets

from fastapi import HTTPException
from sqlalchemy import func, select
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes
from webauthn.helpers.exceptions import InvalidAuthenticationResponse, InvalidRegistrationResponse
from webauthn.helpers.structs import (
    AttestationConveyancePreference,
    AuthenticatorAttachment,
    PublicKeyCredentialHint,
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from src.config import get_impostazioni
from src.mfa.models import AuthMfaUtente, AuthPasskey
from src.otp.identita import impronta

TIPO_REGISTRAZIONE = "passkey_registra"
TIMEOUT_MS = 120_000
MESSAGGIO_NON_VALIDA = "Verifica della passkey non riuscita. Riprova."


def challenge_di(token: str) -> bytes:
    """32 byte legati al token della sfida e al pepper: ricalcolabili, non conservati."""
    return bytes.fromhex(impronta("webauthn:" + token))


def _handle(db, utente) -> bytes:
    riga = db.get(AuthMfaUtente, utente.utente_id)
    if riga is None:
        riga = AuthMfaUtente(utente_id=utente.utente_id, mfa_user_handle=secrets.token_bytes(32),
                             mfa_creato_il=func.now())
        db.add(riga)
        db.commit()
        db.refresh(riga)
    return riga.mfa_user_handle


def attive(db, utente_id: int) -> list[AuthPasskey]:
    return list(db.scalars(select(AuthPasskey).where(
        AuthPasskey.utente_id == utente_id, AuthPasskey.pk_revocato_il.is_(None),
    ).order_by(AuthPasskey.pk_id)))


def elenco(db, utente_id: int) -> list[dict]:
    return [{
        "id": p.pk_id, "nome": p.pk_nome,
        "creata_il": p.pk_creato_il.isoformat() if p.pk_creato_il else None,
        "ultimo_uso": p.pk_ultimo_uso.isoformat() if p.pk_ultimo_uso else None,
        "sincronizzata": bool(p.pk_backed_up),
    } for p in attive(db, utente_id)]


def _nome_visualizzato(cliente, utente) -> str:
    nome = " ".join(parte for parte in ((cliente.cliente_nome or "").strip(), (cliente.cliente_cognome or "").strip()) if parte)
    return nome or utente.utente_username


def opzioni_registrazione(db, cliente, utente, token: str) -> dict:
    imp = get_impostazioni()
    opzioni = generate_registration_options(
        rp_id=imp.webauthn_rp_id, rp_name=imp.webauthn_nome,
        user_id=_handle(db, utente), user_name=utente.utente_username,
        user_display_name=_nome_visualizzato(cliente, utente),
        challenge=challenge_di(token), timeout=TIMEOUT_MS,
        attestation=AttestationConveyancePreference.NONE,
        authenticator_selection=AuthenticatorSelectionCriteria(
            authenticator_attachment=AuthenticatorAttachment.CROSS_PLATFORM,
            resident_key=ResidentKeyRequirement.REQUIRED,
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
        exclude_credentials=[PublicKeyCredentialDescriptor(id=p.pk_credential_id) for p in attive(db, utente.utente_id)],
        # Con il solo `cross-platform` Windows apre la finestra sulla chiave USB e
        # il telefono sta dietro "Cambia"; `hybrid` fa partire dal QR i browser
        # che lo capiscono, gli altri lo ignorano.
        hints=[PublicKeyCredentialHint.HYBRID],
    )
    return json.loads(options_to_json(opzioni))


def registra(db, utente, token: str, credenziale: dict, nome: str) -> AuthPasskey:
    imp = get_impostazioni()
    try:
        esito = verify_registration_response(
            credential=json.dumps(credenziale), expected_challenge=challenge_di(token),
            expected_rp_id=imp.webauthn_rp_id, expected_origin=imp.lista_webauthn_origini,
            require_user_verification=True,
        )
    except (InvalidRegistrationResponse, ValueError, KeyError, TypeError):
        raise HTTPException(400, MESSAGGIO_NON_VALIDA) from None
    if db.scalar(select(AuthPasskey).where(AuthPasskey.pk_credential_id == esito.credential_id)) is not None:
        raise HTTPException(409, "Questa passkey è già registrata.")
    trasporti = credenziale.get("response", {}).get("transports") or []
    riga = AuthPasskey(
        utente_id=utente.utente_id, pk_credential_id=esito.credential_id,
        pk_chiave_pubblica=esito.credential_public_key, pk_sign_count=esito.sign_count,
        pk_aaguid=bytes.fromhex(esito.aaguid.replace("-", "")) if esito.aaguid else None,
        pk_trasporti=",".join(str(t) for t in trasporti)[:100] or None,
        pk_backup_eligible=int(esito.credential_device_type == "multi_device"),
        pk_backed_up=int(esito.credential_backed_up),
        pk_nome=nome.strip()[:80] or "Passkey", pk_creato_il=func.now(),
    )
    db.add(riga)
    db.flush()
    return riga


def opzioni_autenticazione(db, utente, token: str) -> dict:
    imp = get_impostazioni()
    opzioni = generate_authentication_options(
        rp_id=imp.webauthn_rp_id, challenge=challenge_di(token), timeout=TIMEOUT_MS,
        allow_credentials=[PublicKeyCredentialDescriptor(id=p.pk_credential_id) for p in attive(db, utente.utente_id)],
        user_verification=UserVerificationRequirement.REQUIRED,
    )
    # La libreria non ha ancora `hints` per l'autenticazione: si aggiunge al JSON.
    return {**json.loads(options_to_json(opzioni)), "hints": [PublicKeyCredentialHint.HYBRID.value]}


def autentica(db, utente, token: str, credenziale: dict) -> AuthPasskey | None:
    """La passkey che ha firmato la sfida, aggiornata; None se la risposta non regge.
    Non committa: il chiamante chiude con la sfida e la sessione."""
    imp = get_impostazioni()
    try:
        credential_id = base64url_to_bytes(credenziale.get("rawId") or credenziale["id"])
    except (KeyError, TypeError, ValueError):
        return None
    riga = db.scalar(select(AuthPasskey).where(
        AuthPasskey.utente_id == utente.utente_id, AuthPasskey.pk_credential_id == credential_id,
        AuthPasskey.pk_revocato_il.is_(None),
    ))
    if riga is None:
        return None
    try:
        esito = verify_authentication_response(
            credential=json.dumps(credenziale), expected_challenge=challenge_di(token),
            expected_rp_id=imp.webauthn_rp_id, expected_origin=imp.lista_webauthn_origini,
            credential_public_key=riga.pk_chiave_pubblica,
            credential_current_sign_count=riga.pk_sign_count, require_user_verification=True,
        )
    except (InvalidAuthenticationResponse, ValueError, KeyError, TypeError):
        return None
    riga.pk_sign_count = esito.new_sign_count
    riga.pk_backed_up = int(esito.credential_backed_up)
    riga.pk_ultimo_uso = func.now()
    db.flush()
    return riga


def rimuovi(db, utente, pk_id: int) -> None:
    riga = db.scalar(select(AuthPasskey).where(
        AuthPasskey.pk_id == pk_id, AuthPasskey.utente_id == utente.utente_id,
        AuthPasskey.pk_revocato_il.is_(None),
    ))
    if riga is None:
        raise HTTPException(404, "Passkey non trovata.")
    riga.pk_revocato_il = func.now()
    db.commit()


def azzera(db, utente_id: int) -> int:
    """Revoca tutte le passkey attive (azzeramento amministrativo). Quante erano."""
    righe = attive(db, utente_id)
    for riga in righe:
        riga.pk_revocato_il = func.now()
    return len(righe)
