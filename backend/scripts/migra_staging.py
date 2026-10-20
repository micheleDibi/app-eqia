"""Applica soltanto le migrazioni mancanti al database dedicato."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.ambiente_staging import verifica_staging
from src.config import get_impostazioni
from src.database_trasporto import opzioni
from src.migrazioni import applica_schema

if __name__ == "__main__":
    imp = get_impostazioni()
    verifica_staging(imp)
    applica_schema(imp.database_url, opzioni(imp.database_url, imp))
