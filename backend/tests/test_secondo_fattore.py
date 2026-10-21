"""Secondo fattore del Nazionale (V2): codice via email, authenticator e
passkey; attivazione e rimozione dal profilo, accesso con ciascun metodo,
cambio di metodo e casi di errore. La passkey la firma un autenticatore
software, con le stesse regole WebAuthn di un dispositivo."""
import base64
import hashlib
import json
import os
import re
from contextlib import ExitStack

import cbor2
import pytest
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from src.main import app
from src.mfa import totp
from src.notifiche.backend_invio import backend_memoria
from conftest import PASSWORD

STARTUP, NAZIONALE = 1, 5
ORIGINE, RP_ID = "http://localhost:5180", "localhost"


def b64u(dati: bytes) -> str:
    return base64.urlsafe_b64encode(dati).rstrip(b"=").decode()


def codice_mail():
    messaggio = backend_memoria().inviate[-1].get_body(preferencelist=("plain",)).get_content()
    return re.search(r"\b\d{6}\b", messaggio).group()


class Autenticatore:
    """Una passkey software: chiave P-256, attestazione "none", firma ES256."""

    def __init__(self):
        self.chiave = ec.generate_private_key(ec.SECP256R1())
        self.id = os.urandom(16)
        self.contatore = 0

    def _cliente(self, tipo, challenge):
        return json.dumps({"type": tipo, "challenge": challenge, "origin": ORIGINE, "crossOrigin": False}).encode()

    def registra(self, opzioni):
        numeri = self.chiave.public_key().public_numbers()
        cose = cbor2.dumps({1: 2, 3: -7, -1: 1, -2: numeri.x.to_bytes(32, "big"), -3: numeri.y.to_bytes(32, "big")})
        dati = (hashlib.sha256(RP_ID.encode()).digest() + bytes([0x45]) + (0).to_bytes(4, "big")
                + bytes(16) + len(self.id).to_bytes(2, "big") + self.id + cose)
        attestazione = cbor2.dumps({"fmt": "none", "attStmt": {}, "authData": dati})
        return {"id": b64u(self.id), "rawId": b64u(self.id), "type": "public-key", "clientExtensionResults": {},
                "response": {"clientDataJSON": b64u(self._cliente("webauthn.create", opzioni["challenge"])),
                             "attestationObject": b64u(attestazione), "transports": ["hybrid"]}}

    def firma(self, opzioni, challenge=None):
        self.contatore += 1
        cliente = self._cliente("webauthn.get", challenge or opzioni["challenge"])
        dati = hashlib.sha256(RP_ID.encode()).digest() + bytes([0x05]) + self.contatore.to_bytes(4, "big")
        firma = self.chiave.sign(dati + hashlib.sha256(cliente).digest(), ec.ECDSA(hashes.SHA256()))
        return {"id": b64u(self.id), "rawId": b64u(self.id), "type": "public-key", "clientExtensionResults": {},
                "response": {"clientDataJSON": b64u(cliente), "authenticatorData": b64u(dati),
                             "signature": b64u(firma), "userHandle": None}}


@pytest.fixture
def orologio(monkeypatch):
    """Il passo TOTP corrente, spostabile a mano: i codici non dipendono dall'ora del test."""
    passo = [totp.passo_corrente()]
    monkeypatch.setattr(totp, "passo_corrente", lambda adesso=None: passo[0])
    return passo


@pytest.fixture
def browsers():
    with ExitStack() as pila:
        def nuovo():
            return pila.enter_context(TestClient(app, base_url=ORIGINE,
                                                 headers={"X-EQIA-Request": "1", "Origin": ORIGINE}))
        yield nuovo


@pytest.fixture
def nazionale(account, browsers):
    """Un Nazionale gia' entrato una volta (email verificata), con la sua sessione."""
    utente, _ = account(NAZIONALE)
    browser = browsers()
    avvio = login(browser, utente)
    assert avvio["metodo"] == "email_accesso"
    entra(browser, browser.post("/auth/verifica-otp", json={"sfida": avvio["sfida"], "codice": codice_mail()}))
    return utente, browser


def login(browser, utente, password=PASSWORD):
    risposta = browser.post("/auth/login", json={"utente_username": utente.utente_username, "utente_password": password})
    assert risposta.status_code == 200, risposta.text
    return risposta.json()


def entra(browser, risposta):
    assert risposta.status_code == 200, risposta.text
    browser.headers["X-CSRF-Token"] = risposta.json()["csrf_token"]
    return risposta.json()


def attiva_totp(browser, orologio):
    avvio = browser.post("/auth/mfa/totp/attiva", json={"password": PASSWORD})
    assert avvio.status_code == 200, avvio.text
    segreto = base64.b32decode(avvio.json()["segreto"] + "=" * (-len(avvio.json()["segreto"]) % 8))
    conferma = browser.post("/auth/mfa/totp/conferma", json={"codice": totp.codice(segreto, orologio[0])})
    assert conferma.status_code == 200, conferma.text
    return segreto


def aggiungi_passkey(browser, autenticatore):
    opzioni = browser.post("/auth/mfa/passkey/opzioni", json={"password": PASSWORD})
    assert opzioni.status_code == 200, opzioni.text
    conferma = browser.post("/auth/mfa/passkey/conferma", json={
        "sfida": opzioni.json()["sfida"], "credenziale": autenticatore.registra(opzioni.json()["opzioni"]),
        "nome": "Telefono di prova"})
    assert conferma.status_code == 200, conferma.text
    return conferma.json()


# =============================================================================
# Codice via email
# =============================================================================
def test_dal_secondo_accesso_il_metodo_e_il_codice_via_email(nazionale, browsers):
    utente, browser = nazionale
    assert browser.get("/auth/mfa").json()["metodi"] == ["email"]
    nuovo = browsers()
    avvio = login(nuovo, utente)
    assert (avvio["metodo"], avvio["metodi"]) == ("email", ["email"])
    entra(nuovo, nuovo.post("/auth/verifica-otp", json={"sfida": avvio["sfida"], "codice": codice_mail()}))
    assert nuovo.get("/profilo/me").status_code == 200


def test_codice_email_sbagliato_e_tentativi_finiti(nazionale, browsers):
    utente, _ = nazionale
    nuovo = browsers()
    avvio = login(nuovo, utente)
    giusto = codice_mail()
    sbagliato = "000000" if giusto != "000000" else "111111"
    for _ in range(5):
        assert nuovo.post("/auth/verifica-otp", json={"sfida": avvio["sfida"], "codice": sbagliato}).status_code == 400
    # Finiti i tentativi, nemmeno il codice giusto apre la sessione.
    assert nuovo.post("/auth/verifica-otp", json={"sfida": avvio["sfida"], "codice": giusto}).status_code == 400
    assert nuovo.get("/auth/session").status_code == 401


def test_il_codice_si_usa_una_volta(nazionale, browsers):
    utente, _ = nazionale
    primo = browsers()
    avvio = login(primo, utente)
    codice = codice_mail()
    entra(primo, primo.post("/auth/verifica-otp", json={"sfida": avvio["sfida"], "codice": codice}))
    secondo = browsers()
    assert secondo.post("/auth/verifica-otp", json={"sfida": avvio["sfida"], "codice": codice}).status_code == 400


def test_il_reinvio_aspetta_un_minuto(nazionale, browsers):
    utente, _ = nazionale
    nuovo = browsers()
    avvio = login(nuovo, utente)
    risposta = nuovo.post("/auth/rigenera-otp", json={"sfida": avvio["sfida"]})
    assert risposta.status_code == 429
    assert int(risposta.headers["Retry-After"]) > 0


def test_codici_email_finiti_il_login_lo_dice(nazionale, browsers):
    """Un nuovo login entro il minuto rispedirebbe il codice: il 429 deve dire
    che il limite e' sugli invii, non far credere a una password sbagliata."""
    utente, _ = nazionale
    login(browsers(), utente)
    risposta = browsers().post("/auth/login", json={"utente_username": utente.utente_username,
                                                     "utente_password": PASSWORD})
    assert risposta.status_code == 429
    assert int(risposta.headers["Retry-After"]) > 0
    assert risposta.json()["detail"] == "Troppi codici di verifica inviati. Attendi prima di richiederne un altro."


def test_solo_il_nazionale_gestisce_il_secondo_fattore(account, browsers):
    utente, _ = account(STARTUP)
    browser = browsers()
    entra(browser, browser.post("/auth/login", json={"utente_username": utente.utente_username,
                                                     "utente_password": PASSWORD}))
    assert browser.get("/auth/mfa").status_code == 403
    assert browser.post("/auth/mfa/totp/attiva", json={"password": PASSWORD}).status_code == 403


# =============================================================================
# Authenticator
# =============================================================================
def test_authenticator_attivato_e_proposto_al_login(nazionale, browsers, orologio):
    utente, browser = nazionale
    segreto = attiva_totp(browser, orologio)
    stato = browser.get("/auth/mfa").json()
    assert stato["metodi"] == ["totp", "email"] and stato["totp"]["attivo"] is True

    nuovo = browsers()
    avvio = login(nuovo, utente)
    assert (avvio["metodo"], avvio["metodi"]) == ("totp", ["totp", "email"])
    orologio[0] += 1
    entra(nuovo, nuovo.post("/auth/mfa/verifica-totp",
                            json={"sfida": avvio["sfida"], "codice": totp.codice(segreto, orologio[0])}))


def test_authenticator_codice_sbagliato_o_gia_usato(nazionale, browsers, orologio):
    utente, browser = nazionale
    segreto = attiva_totp(browser, orologio)
    # Il codice usato per l'attivazione non vale per entrare.
    usato = totp.codice(segreto, orologio[0])
    nuovo = browsers()
    avvio = login(nuovo, utente)
    assert nuovo.post("/auth/mfa/verifica-totp", json={"sfida": avvio["sfida"], "codice": usato}).status_code == 400
    # Un codice di troppo tempo fa nemmeno.
    vecchio = totp.codice(segreto, orologio[0] - 5)
    assert nuovo.post("/auth/mfa/verifica-totp", json={"sfida": avvio["sfida"], "codice": vecchio}).status_code == 400
    assert nuovo.get("/auth/session").status_code == 401


def test_attivazione_con_password_e_codice_giusti(nazionale, orologio):
    _, browser = nazionale
    assert browser.post("/auth/mfa/totp/attiva", json={"password": "Password-sbagliata-1!"}).status_code == 400
    avvio = browser.post("/auth/mfa/totp/attiva", json={"password": PASSWORD})
    assert avvio.json()["uri"].startswith("otpauth://totp/")
    assert avvio.json()["qr_svg"].startswith("<svg")
    assert browser.post("/auth/mfa/totp/conferma", json={"codice": "000000"}).status_code in (400, 429)
    assert browser.get("/auth/mfa").json()["totp"] == {"attivo": False, "pendente": True, "attivato_il": None}


def test_disattivazione_con_password_e_codice(nazionale, browsers, orologio):
    utente, browser = nazionale
    segreto = attiva_totp(browser, orologio)
    orologio[0] += 1
    codice = totp.codice(segreto, orologio[0])
    assert browser.post("/auth/mfa/totp/disattiva",
                        json={"password": "Password-sbagliata-1!", "codice": codice}).status_code == 400
    assert browser.post("/auth/mfa/totp/disattiva", json={"password": PASSWORD, "codice": codice}).status_code == 200
    assert browser.get("/auth/mfa").json()["metodi"] == ["email"]
    assert login(browsers(), utente)["metodo"] == "email"


# =============================================================================
# Passkey
# =============================================================================
def test_passkey_registrata_e_usata_per_entrare(nazionale, browsers):
    utente, browser = nazionale
    chiave = Autenticatore()
    stato = aggiungi_passkey(browser, chiave)
    assert stato["metodi"] == ["passkey", "email"]
    assert [p["nome"] for p in stato["passkey"]] == ["Telefono di prova"]

    nuovo = browsers()
    avvio = login(nuovo, utente)
    assert avvio["metodo"] == "passkey"
    entra(nuovo, nuovo.post("/auth/mfa/verifica-passkey",
                            json={"sfida": avvio["sfida"], "credenziale": chiave.firma(avvio["opzioni"])}))
    assert nuovo.get("/profilo/me").status_code == 200


def test_passkey_con_firma_sbagliata_o_di_un_altro_dispositivo(nazionale, browsers):
    utente, browser = nazionale
    chiave = Autenticatore()
    aggiungi_passkey(browser, chiave)
    nuovo = browsers()
    avvio = login(nuovo, utente)
    # Firma di un'altra sfida.
    altra = chiave.firma(avvio["opzioni"], challenge=b64u(os.urandom(32)))
    assert nuovo.post("/auth/mfa/verifica-passkey", json={"sfida": avvio["sfida"], "credenziale": altra}).status_code == 400
    # Un dispositivo mai registrato.
    estranea = Autenticatore().firma(avvio["opzioni"])
    assert nuovo.post("/auth/mfa/verifica-passkey",
                      json={"sfida": avvio["sfida"], "credenziale": estranea}).status_code == 400
    assert nuovo.get("/auth/session").status_code == 401


def test_passkey_si_aggiunge_con_la_password_e_non_due_volte(nazionale):
    _, browser = nazionale
    assert browser.post("/auth/mfa/passkey/opzioni", json={"password": "Password-sbagliata-1!"}).status_code == 400
    chiave = Autenticatore()
    aggiungi_passkey(browser, chiave)
    opzioni = browser.post("/auth/mfa/passkey/opzioni", json={"password": PASSWORD}).json()
    doppia = browser.post("/auth/mfa/passkey/conferma", json={
        "sfida": opzioni["sfida"], "credenziale": chiave.registra(opzioni["opzioni"]), "nome": "Ancora"})
    assert doppia.status_code == 409


def test_passkey_rimossa_non_apre_piu(nazionale, browsers):
    utente, browser = nazionale
    chiave = Autenticatore()
    pk_id = aggiungi_passkey(browser, chiave)["passkey"][0]["id"]
    assert browser.post("/auth/mfa/passkey/rimuovi", json={"password": "Password-sbagliata-1!", "id": pk_id}).status_code == 400
    assert browser.post("/auth/mfa/passkey/rimuovi", json={"password": PASSWORD, "id": pk_id}).json()["passkey"] == []
    avvio = login(browsers(), utente)
    assert avvio["metodo"] == "email"


# =============================================================================
# Cambio di metodo
# =============================================================================
def test_si_puo_scegliere_un_altro_metodo_posseduto(nazionale, browsers, orologio):
    utente, browser = nazionale
    aggiungi_passkey(browser, Autenticatore())
    segreto = attiva_totp(browser, orologio)
    nuovo = browsers()
    avvio = login(nuovo, utente)
    assert (avvio["metodo"], avvio["metodi"]) == ("passkey", ["passkey", "totp", "email"])

    cambio = nuovo.post("/auth/mfa/metodo", json={"sfida": avvio["sfida"], "metodo": "totp"})
    assert cambio.status_code == 200, cambio.text
    # La sfida di prima non vale piu'.
    assert nuovo.post("/auth/mfa/verifica-passkey",
                      json={"sfida": avvio["sfida"], "credenziale": {"id": "x"}}).status_code == 400
    orologio[0] += 1
    entra(nuovo, nuovo.post("/auth/mfa/verifica-totp",
                            json={"sfida": cambio.json()["sfida"], "codice": totp.codice(segreto, orologio[0])}))


def test_non_si_sceglie_un_metodo_che_non_si_ha(nazionale, browsers):
    utente, _ = nazionale
    nuovo = browsers()
    avvio = login(nuovo, utente)
    assert nuovo.post("/auth/mfa/metodo", json={"sfida": avvio["sfida"], "metodo": "totp"}).status_code == 400
