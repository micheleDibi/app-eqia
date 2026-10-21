"""Verifica di email e cellulare dalla scheda (V2): casi di errore."""
import re
from contextlib import ExitStack

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from src.main import app
from src.notifiche.backend_invio import backend_memoria
from conftest import PASSWORD

STARTUP, NAZIONALE = 1, 5
ORIGINE = "http://localhost:5180"


@pytest.fixture
def accedi(account):
    with ExitStack() as pila:
        def entra(ruolo):
            utente, _ = account(ruolo)
            browser = pila.enter_context(TestClient(app, base_url=ORIGINE,
                                                    headers={"X-EQIA-Request": "1", "Origin": ORIGINE}))
            risposta = browser.post("/auth/login", json={"utente_username": utente.utente_username,
                                                         "utente_password": PASSWORD})
            if risposta.json().get("requires_2fa"):
                messaggio = backend_memoria().inviate[-1].get_body(preferencelist=("plain",)).get_content()
                codice = re.search(r"\b\d{6}\b", messaggio).group()
                risposta = browser.post("/auth/verifica-otp", json={"sfida": risposta.json()["sfida"], "codice": codice})
            assert risposta.status_code == 200, risposta.text
            browser.headers["X-CSRF-Token"] = risposta.json()["csrf_token"]
            return utente, browser
        yield entra


@pytest.fixture
def scheda(account, db):
    """Un'anagrafica con account non ancora attivo: email e cellulare da verificare."""
    _, cliente = account(STARTUP, attivo=0)
    db.execute(text("UPDATE clienti SET cliente_cellulare = '333 123 4567' WHERE cliente_id = :c"),
               {"c": cliente.cliente_id})
    db.commit()
    return cliente


def invia(browser, cliente, tipo, valore):
    return browser.post(f"/clienti/{cliente.cliente_id}/contatti/{tipo}/genera-otp", json={"valore": valore})


def test_codice_sbagliato(accedi, scheda):
    _, browser = accedi(NAZIONALE)
    invio = invia(browser, scheda, "email", scheda.cliente_email)
    assert invio.status_code == 200, invio.text
    messaggio = backend_memoria().inviate[-1].get_body(preferencelist=("plain",)).get_content()
    giusto = re.search(r"\b\d{6}\b", messaggio).group()
    sbagliato = "000000" if giusto != "000000" else "111111"
    esito = browser.post(f"/clienti/{scheda.cliente_id}/contatti/email/verifica-otp",
                         json={"sfida": invio.json()["sfida"], "codice": sbagliato})
    assert esito.status_code == 400
    assert browser.get(f"/clienti/{scheda.cliente_id}/contatti").json()["email"]["verificato"] is False


def test_il_valore_deve_essere_quello_salvato(accedi, scheda):
    _, browser = accedi(NAZIONALE)
    risposta = invia(browser, scheda, "email", "altra@example.org")
    assert risposta.status_code == 409
    assert risposta.json()["detail"] == "Il contatto è cambiato. Salva e ricarica la scheda prima della verifica."


def test_un_contatto_verificato_non_si_riverifica(accedi, scheda):
    _, browser = accedi(NAZIONALE)
    invio = invia(browser, scheda, "email", scheda.cliente_email)
    codice = re.search(r"\b\d{6}\b", backend_memoria().inviate[-1].get_body(preferencelist=("plain",)).get_content()).group()
    assert browser.post(f"/clienti/{scheda.cliente_id}/contatti/email/verifica-otp",
                        json={"sfida": invio.json()["sfida"], "codice": codice}).status_code == 200
    di_nuovo = invia(browser, scheda, "email", scheda.cliente_email)
    assert di_nuovo.status_code == 409
    assert di_nuovo.json()["detail"] == "Il contatto è già verificato."


def test_tra_due_invii_passa_un_minuto(accedi, scheda):
    _, browser = accedi(NAZIONALE)
    assert invia(browser, scheda, "email", scheda.cliente_email).status_code == 200
    secondo = invia(browser, scheda, "email", scheda.cliente_email)
    assert secondo.status_code == 429
    assert int(secondo.headers["Retry-After"]) > 0


def test_il_cellulare_italiano_prende_il_prefisso(accedi, scheda):
    from src.notifiche.sms import memoria_sms
    _, browser = accedi(NAZIONALE)
    assert invia(browser, scheda, "cellulare", "333 123 4567").status_code == 200
    assert memoria_sms.inviati[-1][0] == "+393331234567"


def test_cellulare_non_valido(accedi, scheda, db):
    db.execute(text("UPDATE clienti SET cliente_cellulare = '12' WHERE cliente_id = :c"), {"c": scheda.cliente_id})
    db.commit()
    _, browser = accedi(NAZIONALE)
    risposta = invia(browser, scheda, "cellulare", "12")
    assert risposta.status_code == 422
    assert risposta.json()["detail"] == "Inserisci un cellulare valido con prefisso internazionale."


def test_chi_non_vede_l_anagrafica_riceve_non_trovata(accedi, scheda):
    _, browser = accedi(STARTUP)
    assert browser.get(f"/clienti/{scheda.cliente_id}/contatti").status_code == 404
    risposta = invia(browser, scheda, "email", scheda.cliente_email)
    assert risposta.status_code == 404
    assert risposta.json()["detail"] == "Anagrafica non trovata."
