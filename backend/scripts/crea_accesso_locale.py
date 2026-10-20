"""Un amministratore sintetico, solo per il database di sviluppo Equia."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.accesso_iniziale import crea_accesso_iniziale
from src.config import get_impostazioni, DIR_BACKEND
from src.inizializzazione import verifica_destinazione


def main():
    imp = get_impostazioni()
    verifica_destinazione(imp.database_url)
    if imp.ersaf_env != "sviluppo" or "/eqia_dev" not in imp.database_url:
        raise SystemExit("Questo comando richiede il database locale di sviluppo.")
    crea_accesso_iniziale("nazionale.locale", DIR_BACKEND / "var/accesso-locale.txt")


if __name__ == "__main__":
    main()
