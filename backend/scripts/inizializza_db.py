"""Applica la base sul solo database locale Equia."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.config import get_impostazioni
from src.inizializzazione import inizializza

if __name__ == "__main__":
    inizializza(get_impostazioni().database_url)
