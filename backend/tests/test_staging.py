"""Prove dei confini di rilascio; nessuna connessione a database remoti."""
from types import SimpleNamespace
import pytest
from sqlalchemy import text
from src.accesso_iniziale import crea_accesso_iniziale
from src.ambiente_staging import verifica_staging
from src.database_trasporto import opzioni
from src.migrazioni import applica_migrazione
from src.database import engine
from conftest import TEST_URL


def impostazioni(**valori):
    base = dict(database_url="mysql+pymysql://eqia_app:esempio@db:3306/eqia_staging",
                frontend_base_url="https://eqiastaging.ersaf.it",
                database_trasporto="verify-full", database_ca_file="/run/secrets/db-ca.crt",
                ersaf_env="sviluppo")
    return SimpleNamespace(**(base | valori))


def test_staging_richiede_destinazione_e_marker(monkeypatch):
    monkeypatch.delenv("EQIA_AMBIENTE", raising=False)
    with pytest.raises(ValueError):
        verifica_staging(impostazioni())
    monkeypatch.setenv("EQIA_AMBIENTE", "staging")
    verifica_staging(impostazioni())


@pytest.mark.parametrize("valori", [
    {"database_url": "mysql+pymysql://eqia_app:x@db:3306/universita"},
    {"database_url": TEST_URL},
    {"database_url": "mysql+pymysql://root:x@db:3306/eqia_staging"},
    {"database_url": "mysql+pymysql://eqia_app:x@192.168.40.12:3306/eqia_staging"},
    {"frontend_base_url": "https://unistaging.ersaf.it"},
    {"database_ca_file": ""},
    {"database_trasporto": "rete-privata"},
])
def test_staging_rifiuta_destinazioni_e_trasporti_diversi(monkeypatch, valori):
    monkeypatch.setenv("EQIA_AMBIENTE", "staging")
    with pytest.raises(ValueError):
        verifica_staging(impostazioni(**valori))


def test_ca_mancante_non_degrada_a_connessione_in_chiaro():
    imp = impostazioni(database_ca_file="file-certificato-assente.crt")
    with pytest.raises(ValueError, match="CA leggibile"):
        opzioni(imp.database_url, imp)
    imp = impostazioni(database_ca_file="")
    assert "ssl" not in opzioni(TEST_URL, imp)


def test_migrazione_modificata_rifiutata_prima_di_eseguire_sql(db, tmp_path):
    percorso = tmp_path / "000_schema.sql"
    percorso.write_text("DROP DATABASE bersaglio_vietato;", encoding="utf-8")
    with pytest.raises(ValueError, match="già applicata e modificata"):
        applica_migrazione(engine, TEST_URL, percorso)
    assert db.scalar(text("SELECT COUNT(*) FROM ruoli")) == 4


def test_accesso_iniziale_non_sovrascrive_account(db, tmp_path):
    percorso = tmp_path / "credenziali.txt"
    crea_accesso_iniziale("nazionale.test", percorso)
    assert db.scalar(text("SELECT COUNT(*) FROM utenti")) == 1
    assert "Password:" in percorso.read_text()
    with pytest.raises(ValueError, match="Esiste già un account"):
        crea_accesso_iniziale("secondo.test", tmp_path / "altro.txt")
    assert not (tmp_path / "altro.txt").exists()
