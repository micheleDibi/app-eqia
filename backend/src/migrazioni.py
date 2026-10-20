"""Registro incrementale condiviso da bootstrap locale e rilascio staging."""
import hashlib
from pathlib import Path
from sqlalchemy import create_engine, inspect, text
from src.contratti import leggi_catalogo
from src.schema_sql import esegui_file_sql

MIGRAZIONI = Path(__file__).resolve().parents[2] / "db/migrations"


def applica_schema(url_database, connect_args=None):
    engine = create_engine(url_database, hide_parameters=True, connect_args=connect_args or {})
    try:
        tabelle = inspect(engine).get_table_names()
        if tabelle and "schema_versioni" not in tabelle:
            raise ValueError("Database non vuoto e privo del registro migrazioni: operazione rifiutata.")
        with engine.begin() as conn:
            conn.execute(text("CREATE TABLE IF NOT EXISTS schema_versioni (nome VARCHAR(255) PRIMARY KEY, sha256 CHAR(64) NOT NULL)"))
        for percorso in sorted(MIGRAZIONI.glob("*.sql")):
            applica_migrazione(engine, url_database, percorso, connect_args)
        sincronizza_ruoli(engine)
    finally:
        engine.dispose()


def applica_migrazione(engine, url_database, percorso, connect_args=None):
    impronta = hashlib.sha256(percorso.read_bytes()).hexdigest()
    with engine.connect() as conn:
        precedente = conn.scalar(text("SELECT sha256 FROM schema_versioni WHERE nome=:nome"), {"nome": percorso.name})
    if precedente:
        if precedente != impronta:
            raise ValueError(f"Migrazione già applicata e modificata: {percorso.name}")
        return
    esegui_file_sql(url_database, percorso, connect_args)
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO schema_versioni VALUES (:nome,:sha)"), {"nome": percorso.name, "sha": impronta})
    print(f"Applicata {percorso.name}")


def sincronizza_ruoli(engine):
    with engine.begin() as conn:
        for ruolo in leggi_catalogo("ruoli"):
            conn.execute(text(
                "INSERT INTO ruoli (ruolo_id,ruolo_codice,ruolo_descrizione) VALUES (:id,:codice,:nome) "
                "ON DUPLICATE KEY UPDATE ruolo_codice=VALUES(ruolo_codice),ruolo_descrizione=VALUES(ruolo_descrizione)"
            ), ruolo)
