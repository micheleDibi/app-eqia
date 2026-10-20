"""Isolamento obbligatorio dei test Equia e dati esclusivamente sintetici."""
import os

TEST_URL = "mysql+pymysql://root:test@127.0.0.1:3319/ersaf_test?charset=utf8mb4"
os.environ.update({
    "TEST_DATABASE_URL": TEST_URL, "DATABASE_URL": TEST_URL, "ERSAF_ENV": "test",
    "PASSWORD_RESET_TOKEN_PEPPER": "r" * 48, "SESSION_TOKEN_PEPPER": "s" * 48,
    "TOTP_CHIAVE": "t" * 48, "BCRYPT_COST": "4", "PASSWORD_RESET_BUDGET_MS": "50",
    "EMAIL_BACKEND": "memoria", "SMS_BACKEND": "memoria",
    "FRONTEND_BASE_URL": "http://localhost:5180", "CORS_ORIGINS": "http://localhost:5180",
    "WEBAUTHN_RP_ID": "localhost", "WEBAUTHN_ORIGINI": "http://localhost:5180",
    "EDUNEWS24_BACKEND": "memoria", "EDUNEWS24_URL_BASE": "https://edunews24.invalid/api/v1",
    "EDUNEWS24_HOST_MEDIA": "media.edunews24.invalid", "EDUNEWS24_CONTATTO": "", "LOG_FILE": "",
})

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from src.config import get_impostazioni
from src.database import SessionLocal, engine
from src.inizializzazione import inizializza, verifica_destinazione
from src.main import app
from src.notifiche.backend_invio import backend_memoria
from src.security.password import hash_password
from src.utenti.models import Utente
from src.clienti.models import Cliente

PASSWORD = "Una-password-locale-457!"


@pytest.fixture(autouse=True)
def cache_configurazione():
    get_impostazioni.cache_clear()
    yield
    get_impostazioni.cache_clear()


@pytest.fixture(scope="session")
def schema():
    verifica_destinazione(TEST_URL)
    root = create_engine(TEST_URL.rsplit("/", 1)[0] + "/mysql", hide_parameters=True)
    with root.connect() as conn:
        conn.execute(text("DROP DATABASE IF EXISTS ersaf_test"))
        conn.execute(text("CREATE DATABASE ersaf_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
    root.dispose()
    inizializza(TEST_URL)
    yield
    engine.dispose()


@pytest.fixture
def db(schema):
    conserva = {"ruoli", "messaggi_email", "schema_versioni"}
    with engine.connect() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        for tabella in inspect(engine).get_table_names():
            if tabella not in conserva:
                conn.execute(text(f"TRUNCATE TABLE `{tabella}`"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))
        conn.commit()
    backend_memoria().svuota()
    with SessionLocal() as sessione:
        yield sessione
        sessione.rollback()


@pytest.fixture
def client(db):
    with TestClient(app, base_url="http://localhost:5180",
                    headers={"X-EQIA-Request": "1", "Origin": "http://localhost:5180"}) as browser:
        yield browser


@pytest.fixture
def account(db):
    def crea(ruolo=1, attivo=-1):
        numero = db.scalar(text("SELECT COUNT(*) FROM utenti")) + 1
        utente = Utente(utente_username=f"persona{numero}.test", utente_password="",
                        utente_password_hash=hash_password(PASSWORD), utente_password_algo="bcrypt",
                        utente_attivoSN=attivo)
        db.add(utente)
        db.flush()
        cliente = Cliente(cliente_id=1000 + utente.utente_id, utente_id=utente.utente_id,
                          cliente_nome="Anna", cliente_cognome="Rossi",
                          cliente_email=f"persona{numero}@example.org", cliente_ruolo=ruolo)
        db.add(cliente)
        db.commit()
        return utente, cliente
    return crea
