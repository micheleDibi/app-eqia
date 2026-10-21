"""Prove del collaudo OTP: database locale usa-e-getta, email soltanto su file."""
import re
from datetime import timedelta
from email import policy
from email.parser import BytesParser

import pytest
from sqlalchemy import func, select, update

from conftest import PASSWORD, TEST_URL
from src.config import get_impostazioni
from src.otp import precompilazione
from src.otp.identita import impronta, versione
from src.otp.models import ContattoVerificato, Limite, Sfida


@pytest.fixture
def collaudo(monkeypatch, tmp_path):
    monkeypatch.setenv("EQIA_AMBIENTE", "staging")
    monkeypatch.setenv("EMAIL_BACKEND", "file")
    monkeypatch.setenv("EMAIL_FILE_DIR", str(tmp_path / "email"))
    get_impostazioni.cache_clear()
    # Solo la policy riceve il contratto remoto: engine e richieste usano TEST_URL.
    imp = get_impostazioni().model_copy(update={
        "ersaf_env": "sviluppo", "email_backend": "file",
        "smtp_host": "", "smtp_user": "", "smtp_password": "",
        "database_url": "mysql+pymysql://eqia_app:esempio@db:3306/eqia_staging",
        "database_trasporto": "verify-full", "database_ca_file": "/run/secrets/db-ca.crt",
        "frontend_base_url": "https://eqiastaging.ersaf.it",
    })
    monkeypatch.setattr(precompilazione, "get_impostazioni", lambda: imp)
    return imp


def accedi(client, utente):
    return client.post("/auth/login", json={
        "utente_username": utente.utente_username, "utente_password": PASSWORD,
    })


def conferma(client, dati):
    return client.post("/auth/verifica-otp", json={
        "sfida": dati["sfida"], "codice": dati["codice_precompilato"],
    })


def consenti_reinvio(db):
    db.execute(update(Limite).values(ultimo=db.scalar(select(func.now())) - timedelta(seconds=61)))
    db.commit()


@pytest.mark.parametrize("tipo", ["login", "email_accesso"])
def test_collaudo_ammette_soltanto_i_codici_email_di_accesso(collaudo, tipo):
    assert precompilazione.codice_per_collaudo(tipo, "012345") == {"codice_precompilato": "012345"}


@pytest.mark.parametrize("tipo", ["email", "cellulare", "totp", "passkey", "reset"])
def test_altri_flussi_non_espongono_codici(collaudo, tipo):
    assert precompilazione.codice_per_collaudo(tipo, "012345") == {}


@pytest.mark.parametrize("campo,valore", [
    ("ersaf_env", "produzione"), ("email_backend", "smtp"),
    ("email_backend", "console"), ("email_backend", "memoria"),
    ("smtp_host", "smtp.example.org"), ("smtp_user", "posta@example.org"),
    ("smtp_password", "valore-di-prova"),
    ("frontend_base_url", "https://eqia.example.org"),
    ("database_url", TEST_URL), ("database_url", "mysql+pymysql://eqia_app:x@db:3306/altro"),
    ("database_trasporto", "rete-privata"), ("database_ca_file", ""),
])
def test_smtp_produzione_e_destinazioni_estranee_disattivano(collaudo, campo, valore):
    setattr(collaudo, campo, valore)
    assert precompilazione.codice_per_collaudo("login", "012345") == {}


@pytest.mark.parametrize("marker", [None, "sviluppo", "produzione"])
def test_marker_staging_obbligatorio(collaudo, monkeypatch, marker):
    monkeypatch.delenv("EQIA_AMBIENTE", raising=False)
    if marker:
        monkeypatch.setenv("EQIA_AMBIENTE", marker)
    assert precompilazione.codice_per_collaudo("login", "012345") == {}


def test_primo_accesso_precompilato_richiede_conferma_uso_singolo(client, account, collaudo, db):
    utente, _ = account(5)
    risposta = accedi(client, utente)
    dati = risposta.json()
    assert risposta.status_code == 200 and dati["metodo"] == "email_accesso"
    assert risposta.headers["Cache-Control"] == "no-store"
    assert re.fullmatch(r"[0-9]{6}", dati["codice_precompilato"])
    mail = next(collaudo.dir_email_file.glob("*.eml"))
    corpo = BytesParser(policy=policy.default).parsebytes(mail.read_bytes()).get_body(preferencelist=("plain",)).get_content()
    assert dati["codice_precompilato"] in corpo
    db.rollback()  # La richiesta HTTP ha committato attraverso un'altra sessione.
    assert db.get(Sfida, impronta("sfida:" + dati["sfida"])).codice != dati["codice_precompilato"]
    assert "eqia_sessione" not in client.cookies
    assert client.get("/auth/session").status_code == 401
    assert conferma(client, dati).status_code == 200
    assert client.get("/auth/session").status_code == 200
    assert conferma(client, dati).status_code == 400


def test_email_gia_verificata_precompila_il_login(client, account, collaudo, db):
    utente, persona = account(5)
    db.add(ContattoVerificato(cliente_id=persona.cliente_id, tipo="email",
                             versione=versione(persona, "email"), verificato=func.now()))
    db.commit()
    dati = accedi(client, utente).json()
    assert dati["metodo"] == "email" and dati["codice_precompilato"]
    assert conferma(client, dati).status_code == 200


def test_password_errata_non_riceve_codice(client, account, collaudo):
    utente, _ = account(5)
    risposta = client.post("/auth/login", json={
        "utente_username": utente.utente_username, "utente_password": "sbagliata",
    })
    assert risposta.status_code == 401
    assert "codice_precompilato" not in risposta.json()
    assert not list(collaudo.dir_email_file.glob("*.eml"))


def test_reinvio_rispetta_attesa_e_sostituisce_sfida(client, account, collaudo, db):
    utente, _ = account(5)
    prima = accedi(client, utente).json()
    assert client.post("/auth/rigenera-otp", json={"sfida": prima["sfida"]}).status_code == 429
    consenti_reinvio(db)
    risposta = client.post("/auth/rigenera-otp", json={"sfida": prima["sfida"]})
    assert risposta.status_code == 200
    nuova = risposta.json()
    assert nuova["sfida"] != prima["sfida"] and nuova["codice_precompilato"]
    assert conferma(client, prima).status_code == 400
    assert conferma(client, nuova).status_code == 200


def test_configurare_smtp_toglie_codice_al_reinvio(client, account, collaudo, db):
    utente, _ = account(5)
    prima = accedi(client, utente).json()
    collaudo.smtp_host = "smtp.example.org"
    consenti_reinvio(db)
    risposta = client.post("/auth/rigenera-otp", json={"sfida": prima["sfida"]})
    assert risposta.status_code == 200 and "codice_precompilato" not in risposta.json()
    assert conferma(client, prima).status_code == 400
    assert client.get("/auth/session").status_code == 401


def test_codice_scaduto_non_autentica(client, account, collaudo, db):
    utente, _ = account(5)
    dati = accedi(client, utente).json()
    db.execute(update(Sfida).values(scadenza=db.scalar(select(func.now())) - timedelta(seconds=1)))
    db.commit()
    assert conferma(client, dati).status_code == 400
    assert client.get("/auth/session").status_code == 401


def test_errore_salvataggio_email_non_espone_codice(client, account, collaudo):
    collaudo.dir_email_file.write_text("percorso non disponibile", encoding="utf-8")
    utente, _ = account(5)
    risposta = accedi(client, utente)
    assert risposta.status_code == 503 and "codice_precompilato" not in risposta.json()
    assert client.get("/auth/session").status_code == 401


def test_login_normale_non_precompila(client, account):
    utente, _ = account(5)
    risposta = accedi(client, utente)
    assert risposta.status_code == 200 and "codice_precompilato" not in risposta.json()
