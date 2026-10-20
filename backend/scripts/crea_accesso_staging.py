"""Un solo accesso sintetico per il collaudo iniziale dello staging vuoto."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.accesso_iniziale import crea_accesso_iniziale
from src.ambiente_staging import verifica_staging
from src.config import DIR_BACKEND, get_impostazioni

if __name__ == "__main__":
    imp = get_impostazioni()
    verifica_staging(imp)
    if imp.ersaf_env != "sviluppo" or imp.email_backend != "file":
        raise SystemExit("Bootstrap sintetico ammesso soltanto con email su file.")
    crea_accesso_iniziale("nazionale.staging", DIR_BACKEND / "var/accesso/credenziali.txt")
