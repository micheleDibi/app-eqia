"""Confine esplicito dei comandi operativi del solo staging Equia."""
import json
import os
from pathlib import Path
from sqlalchemy.engine import make_url

CONTRATTO = Path(__file__).resolve().parents[2] / "deploy/staging.json"


def verifica_staging(impostazioni):
    contratto = json.loads(CONTRATTO.read_text(encoding="utf-8"))
    url = make_url(impostazioni.database_url)
    destinazione = (url.drivername, url.host, url.port, url.database, url.username)
    attesa = ("mysql+pymysql", "db", 3306, contratto["databaseName"], contratto["databaseUser"])
    if os.environ.get("EQIA_AMBIENTE") != "staging" or destinazione != attesa:
        raise ValueError("Operazione consentita soltanto nel container dello staging Equia.")
    if impostazioni.frontend_base_url != f'https://{contratto["domain"]}':
        raise ValueError("Origine dello staging non corrispondente al contratto.")
    if impostazioni.database_trasporto != "verify-full" or not impostazioni.database_ca_file:
        raise ValueError("Lo staging richiede MariaDB con TLS verificato.")
