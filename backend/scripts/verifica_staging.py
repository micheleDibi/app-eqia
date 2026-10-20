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
from src.notizie.archivio import ConfigArchivio, get_archivio
from uuid import uuid4


def verifica_archivio():
    config = ConfigArchivio()
    config.verifica()
    assert config.ftp_backend == "cartella", "Archivio staging non persistente."
    nome = f"/verifica-{uuid4().hex}"
    archivio = get_archivio()
    try:
        archivio.scrivi(nome, b"verifica archivio")
        assert archivio.leggi(nome) == b"verifica archivio"
    finally:
        (config.dir_cartella / nome.lstrip("/")).unlink(missing_ok=True)

if __name__ == "__main__":
    imp = get_impostazioni()
    verifica_staging(imp)
    verifica_configurazione(imp)
    verifica_archivio()
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
