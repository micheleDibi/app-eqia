"""Verifica del database effettivamente usato dall'API, senza esporre segreti."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from src.ambiente_staging import verifica_staging
from src.config import get_impostazioni, verifica_configurazione
from src.contratti import leggi_catalogo
from src.database import engine

if __name__ == "__main__":
    imp = get_impostazioni()
    verifica_staging(imp)
    verifica_configurazione(imp)
    with engine.connect() as conn:
        cipher = conn.execute(text("SHOW SESSION STATUS LIKE 'Ssl_cipher'")).one()[1]
        assert cipher, "Connessione MariaDB priva di TLS."
        ruoli = set(conn.scalars(text("SELECT ruolo_codice FROM ruoli")))
        assert ruoli == {r["codice"] for r in leggi_catalogo("ruoli")}, "Catalogo ruoli divergente."
        print(json.dumps({
            "database": conn.scalar(text("SELECT DATABASE()")), "tls": cipher,
            "ruoli": len(ruoli), "migrazioni": conn.scalar(text("SELECT COUNT(*) FROM schema_versioni")),
            "utenti": conn.scalar(text("SELECT COUNT(*) FROM utenti")),
            "email": imp.email_backend, "edunews": imp.edunews24_backend,
        }))
