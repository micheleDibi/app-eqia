"""Accesso, uscita, limiti dei tentativi, profilo e recupero della password
(V2): flussi completi e casi di errore."""
import re
from contextlib import ExitStack
from urllib.parse import unquote

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from src.main import app
from src.notifiche.backend_invio import backend_memoria
from conftest import PASSWORD

STARTUP, BUSINESS, NAZIONALE = 1, 2, 5
NUOVA = "Nuova-password-sicura-2026!"
RISPOSTA_RESET = "Se l'indirizzo è associato a un account riceverai una mail"


def browser():
    return TestClient(app, base_url="http://localhost:5180",
                      headers={"X-EQIA-Request": "1", "Origin": "http://localhost:5180"})


def login(client, username, password=PASSWORD):
    return client.post("/auth/login", json={"utente_username": username, "utente_password": password})


def corpo_mail(messaggio):
    return messaggio.get_body(preferencelist=("plain",)).get_content()


def inviate_a(indirizzo):
    return [m for m in backend_memoria().inviate if m["To"] == indirizzo]


@pytest.fixture
def browsers():
    """Browser indipendenti, ciascuno con i suoi cookie."""
    with ExitStack() as pila:
        yield lambda: pila.enter_context(browser())


def richiedi_reset(client, email):
    risposta = client.post("/auth/password-reset/request", json={"email": email})
    assert risposta.status_code == 200, risposta.text
    return risposta


def token_dalla_mail(email):
    messaggio = inviate_a(email)[-1]
    return unquote(re.search(r"reimposta-password\?token=([A-Za-z0-9_%-]+)", corpo_mail(messaggio)).group(1))


def conferma(client, token, password=NUOVA, ripetuta=None):
    return client.post("/auth/password-reset/confirm",
                       json={"token": token, "password": password, "password_conferma": ripetuta or password})


# =============================================================================
# Accesso e uscita
# =============================================================================
def test_password_sbagliata_e_utente_inesistente_rispondono_allo_stesso_modo(client, account):
    utente, _ = account(STARTUP)
    sbagliata = login(client, utente.utente_username, "Password-sbagliata-1!")
    inesistente = login(client, "nessuno.esiste", "Password-sbagliata-1!")
    assert sbagliata.status_code == inesistente.status_code == 401
    assert sbagliata.json() == inesistente.json()
    assert "eqia_sessione" not in client.cookies


def test_il_nome_utente_non_distingue_le_maiuscole(client, account):
    utente, _ = account(STARTUP)
    assert login(client, utente.utente_username.upper()).status_code == 200


def test_dopo_cinque_errori_si_aspetta(client, account):
    utente, _ = account(STARTUP)
    for _ in range(5):
        assert login(client, utente.utente_username, "Password-sbagliata-1!").status_code == 401
    bloccato = login(client, utente.utente_username)
    assert bloccato.status_code == 429
    assert int(bloccato.headers["Retry-After"]) >= 1
    assert "eqia_sessione" not in client.cookies


def test_un_accesso_riuscito_azzera_gli_errori(client, account):
    utente, _ = account(STARTUP)
    for _ in range(4):
        login(client, utente.utente_username, "Password-sbagliata-1!")
    assert login(client, utente.utente_username).status_code == 200
    for _ in range(4):
        assert login(client, utente.utente_username, "Password-sbagliata-1!").status_code == 401


def test_l_uscita_chiude_solo_la_propria_sessione(browsers, account):
    utente, _ = account(STARTUP)
    primo, secondo = browsers(), browsers()
    csrf = login(primo, utente.utente_username).json()["csrf_token"]
    assert login(secondo, utente.utente_username).status_code == 200
    assert primo.post("/auth/logout", headers={"X-CSRF-Token": csrf}).status_code == 204
    assert primo.get("/auth/session").status_code == 401
    assert secondo.get("/auth/session").status_code == 200


def test_senza_sessione_niente_profilo(client):
    assert client.get("/profilo/me").status_code == 401


def test_il_profilo_mostra_i_propri_dati(client, account, db):
    utente, cliente = account(BUSINESS)
    db.execute(text("UPDATE clienti SET cliente_cellulare = '+393331234567' WHERE cliente_id = :c"),
               {"c": cliente.cliente_id})
    db.commit()
    assert login(client, utente.utente_username).status_code == 200
    profilo = client.get("/profilo/me").json()
    assert profilo["username"] == utente.utente_username
    assert profilo["ruolo"] == "business"
    assert (profilo["nome"], profilo["cognome"]) == ("Anna", "Rossi")
    assert profilo["email"] == cliente.cliente_email
    assert profilo["cellulare"] == "+393331234567"


# =============================================================================
# Recupero della password
# =============================================================================
def test_recupero_completo(client, browsers, account, db):
    utente, cliente = account(STARTUP)
    aperta = browsers()
    assert login(aperta, utente.utente_username).status_code == 200

    risposta = richiedi_reset(client, cliente.cliente_email)
    assert RISPOSTA_RESET in risposta.text
    token = token_dalla_mail(cliente.cliente_email)
    assert client.get("/auth/password-reset/validate", params={"token": token}).json() == {"valido": True}
    # Il controllo non consuma il link.
    assert client.get("/auth/password-reset/validate", params={"token": token}).json() == {"valido": True}

    esito = conferma(client, token)
    assert esito.status_code == 200, esito.text
    assert "eqia_sessione" not in client.cookies  # nessun accesso automatico
    # Le sessioni aperte si chiudono; la vecchia password non vale piu'.
    assert aperta.get("/auth/session").status_code == 401
    assert login(browsers(), utente.utente_username).status_code == 401
    assert login(browsers(), utente.utente_username, NUOVA).status_code == 200
    # Avviso del cambio all'indirizzo a cui era arrivato il link.
    assert len(inviate_a(cliente.cliente_email)) == 2


def test_il_link_si_usa_una_volta_sola(client, account):
    _, cliente = account(STARTUP)
    richiedi_reset(client, cliente.cliente_email)
    token = token_dalla_mail(cliente.cliente_email)
    assert conferma(client, token).status_code == 200
    di_nuovo = conferma(client, token, "Altra-password-sicura-2026!")
    assert di_nuovo.status_code == 400
    assert di_nuovo.json()["detail"]["codice"] == "token_non_valido"
    assert client.get("/auth/password-reset/validate", params={"token": token}).json() == \
        {"valido": False, "motivo": "gia_usato"}


def test_il_link_scade(client, account, db):
    _, cliente = account(STARTUP)
    richiedi_reset(client, cliente.cliente_email)
    token = token_dalla_mail(cliente.cliente_email)
    db.execute(text("UPDATE password_reset_token SET prt_expires_at = NOW() - INTERVAL 1 MINUTE"))
    db.commit()
    assert client.get("/auth/password-reset/validate", params={"token": token}).json() == \
        {"valido": False, "motivo": "scaduto"}
    assert conferma(client, token).status_code == 400


def test_una_nuova_richiesta_annulla_il_link_precedente(client, account):
    utente, cliente = account(STARTUP)
    richiedi_reset(client, cliente.cliente_email)
    primo = token_dalla_mail(cliente.cliente_email)
    richiedi_reset(client, cliente.cliente_email)
    secondo = token_dalla_mail(cliente.cliente_email)
    assert primo != secondo
    assert client.get("/auth/password-reset/validate", params={"token": primo}).json() == \
        {"valido": False, "motivo": "non_valido"}
    assert conferma(client, primo).status_code == 400
    assert conferma(client, secondo).status_code == 200


@pytest.mark.parametrize("token", ["", "corto", "x" * 43, "a" * 42 + "!"])
def test_link_inventati(client, token):
    assert client.get("/auth/password-reset/validate", params={"token": token}).json()["valido"] is False
    assert conferma(client, token).status_code == 400


def test_le_due_password_devono_coincidere(client, account):
    _, cliente = account(STARTUP)
    richiedi_reset(client, cliente.cliente_email)
    token = token_dalla_mail(cliente.cliente_email)
    esito = conferma(client, token, NUOVA, "Diversa-password-2026!")
    assert esito.status_code == 422
    assert esito.json()["detail"]["codice"] == "password_non_coincidono"
    # Il link resta buono.
    assert client.get("/auth/password-reset/validate", params={"token": token}).json() == {"valido": True}


@pytest.mark.parametrize("scelta", ["corta1!", "username", "email"])
def test_la_nuova_password_rispetta_le_regole(client, account, scelta):
    utente, cliente = account(STARTUP)
    password = {"corta1!": "corta1!", "username": utente.utente_username, "email": cliente.cliente_email}[scelta]
    richiedi_reset(client, cliente.cliente_email)
    token = token_dalla_mail(cliente.cliente_email)
    esito = conferma(client, token, password)
    assert esito.status_code == 422
    assert esito.json()["detail"]["codice"] == "policy_password"
    assert esito.json()["detail"]["messaggi"]


@pytest.mark.parametrize("caso", ["sconosciuto", "malformato", "disattivato", "senza_ruolo"])
def test_nessuna_mail_ma_stessa_risposta(client, account, caso):
    """Chi chiede non deve capire se l'indirizzo esiste: risposta identica, ma
    nessuna mail per indirizzi sconosciuti, account spenti o senza accesso."""
    _, attivo = account(STARTUP)
    di_riferimento = richiedi_reset(client, attivo.cliente_email).text
    if caso == "sconosciuto":
        email = "nessuno@example.org"
    elif caso == "malformato":
        email = "non-e-una-mail"
    else:
        _, cliente = account(STARTUP, attivo=0) if caso == "disattivato" else account(None)
        email = cliente.cliente_email
    prima = len(backend_memoria().inviate)
    assert richiedi_reset(client, email).text == di_riferimento
    assert len(backend_memoria().inviate) == prima


def test_troppe_richieste_per_lo_stesso_indirizzo(client, account):
    _, cliente = account(STARTUP)
    for _ in range(5):
        richiedi_reset(client, cliente.cliente_email)
    assert len(inviate_a(cliente.cliente_email)) == 5
    # Oltre il limite: stessa risposta, nessuna mail.
    richiedi_reset(client, cliente.cliente_email)
    assert len(inviate_a(cliente.cliente_email)) == 5
