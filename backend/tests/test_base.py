"""Prove del confine della base e dei flussi di accesso ereditati."""
import re

import pytest
from sqlalchemy import inspect, text
from src.auth.ruoli import RUOLI_ASSEGNABILI, RUOLI_ACCESSO
from src.database import engine
from src.inizializzazione import inizializza, verifica_destinazione
from src.notifiche.backend_invio import backend_memoria
from conftest import PASSWORD, TEST_URL


def login(client, utente):
    return client.post("/auth/login", json={"utente_username": utente.utente_username, "utente_password": PASSWORD})


def secondo_fattore(client, risposta):
    messaggio = backend_memoria().inviate[-1].get_body(preferencelist=("plain",)).get_content()
    codice = re.search(r"\b\d{6}\b", messaggio).group()
    return client.post("/auth/verifica-otp", json={"sfida": risposta.json()["sfida"], "codice": codice})


@pytest.mark.parametrize("ruolo,codice", [(1, "startup"), (2, "business"), (3, "startup-for-education")])
def test_login_ruoli_sessione_profilo_logout(client, account, ruolo, codice):
    utente, persona = account(ruolo)
    risposta = login(client, utente)
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()["ruolo_codice"] == codice
    assert risposta.json()["utente_id"] == utente.utente_id != persona.cliente_id
    cookie = risposta.headers["set-cookie"]
    assert "eqia_sessione=" in cookie and "HttpOnly" in cookie and "SameSite=lax" in cookie
    assert "ersaf_sessione=" not in cookie
    assert client.get("/auth/session").status_code == 200
    assert client.get("/profilo/me").json()["nome"] == "Anna"
    token = client.cookies["eqia_sessione"]
    assert client.post("/auth/logout").status_code == 403
    csrf = risposta.json()["csrf_token"]
    assert client.post("/auth/logout", headers={"X-CSRF-Token": csrf}).status_code == 204
    client.cookies.set("eqia_sessione", token)
    assert client.get("/auth/session").status_code == 401


def test_nazionale_non_entra_prima_del_secondo_fattore(client, account):
    utente, _ = account(5)
    risposta = login(client, utente)
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()["requires_2fa"] is True
    assert "eqia_sessione" not in client.cookies
    assert client.get("/profilo/me").status_code == 401
    conferma = secondo_fattore(client, risposta)
    assert conferma.status_code == 200, conferma.text
    assert client.get("/auth/mfa").status_code == 200
    assert secondo_fattore(client, risposta).status_code == 400


@pytest.mark.parametrize("ruolo", [None, 0, 4, 6, 99])
def test_ruoli_estranei_non_accedono(client, account, ruolo):
    utente, _ = account(ruolo)
    assert login(client, utente).status_code == 401
    assert "eqia_sessione" not in client.cookies


def test_account_disattivato_non_accede(client, account):
    utente, _ = account(1, 0)
    assert login(client, utente).status_code == 401


def test_business_non_ottiene_secondo_fattore_o_assegnazioni_superiori(client, account):
    utente, _ = account(2)
    assert login(client, utente).status_code == 200
    assert client.get("/auth/mfa").status_code == 403
    assert RUOLI_ASSEGNABILI["business"] == {"startup", "startup-for-education"}
    assert RUOLI_ACCESSO == {1, 2, 3, 5}


def test_origine_estranea_rifiutata(client, account):
    utente, _ = account()
    risposta = client.post("/auth/login", headers={"Origin": "https://estraneo.example"},
                           json={"utente_username": utente.utente_username, "utente_password": PASSWORD})
    assert risposta.status_code == 403


def test_business_non_accede_ad_account_fuori_dalla_propria_rete(client, account, db):
    business, _ = account(2)
    figlio, persona_figlio = account(1)
    estraneo, persona_estranea = account(3)
    figlio.utente_padre = business.utente_id
    db.commit()
    risposta = login(client, business)
    csrf = {"X-CSRF-Token": risposta.json()["csrf_token"]}
    assert client.get(f"/clienti/{persona_figlio.cliente_id}/contatti").status_code == 200
    assert client.get(f"/clienti/{persona_estranea.cliente_id}/contatti").status_code == 404
    assert client.post(f"/auth/login-as/{estraneo.utente_id}", headers=csrf).status_code == 404
    ammessa = client.post(f"/auth/login-as/{figlio.utente_id}", headers=csrf)
    assert ammessa.status_code == 200
    assert ammessa.json()["utente_id"] == figlio.utente_id


def test_cookie_con_nome_del_gestionale_di_origine_non_autentica(client, account):
    utente, _ = account()
    login(client, utente)
    valore = client.cookies["eqia_sessione"]
    client.cookies.clear()
    client.cookies.set("ersaf_sessione", valore)
    assert client.get("/auth/session").status_code == 401


@pytest.mark.parametrize("percorso", ["/pratiche/", "/pagamenti/", "/realtime/login", "/sicurezza-lavoro/",
                                    "/ricevute/", "/universita/", "/auth/register"])
def test_moduli_esclusi_e_registrazione_pubblica_assenti(client, percorso):
    assert client.get(percorso).status_code == 404


def test_catalogo_quattro_ruoli_e_edunews_protetti(client, account):
    assert client.get("/ruoli/").status_code == 401
    assert client.get("/edunews24/notizie").status_code == 401
    utente, _ = account()
    login(client, utente)
    assert {r["ruolo_codice"] for r in client.get("/ruoli/").json()} == {
        "nazionale", "business", "startup", "startup-for-education"}
    assert client.get("/edunews24/notizie").status_code == 200


def test_bootstrap_idempotente_non_cancella_account(db, account):
    utente, _ = account()
    inizializza(TEST_URL)
    assert db.scalar(text("SELECT COUNT(*) FROM utenti WHERE utente_id=:id"), {"id": utente.utente_id}) == 1
    tabelle = set(inspect(engine).get_table_names())
    assert not {"pratiche", "universita", "enti_bilaterali_partite", "realtime_messaggi"} & tabelle


@pytest.mark.parametrize("url", [
    "mysql+pymysql://x:y@db.example/eqia_dev",
    "mysql+pymysql://x:y@127.0.0.1:3307/ersaf_test",
    "mysql+pymysql://x:y@127.0.0.1:3318/altro",
])
def test_bootstrap_rifiuta_database_estranei(url):
    with pytest.raises(ValueError):
        verifica_destinazione(url)
