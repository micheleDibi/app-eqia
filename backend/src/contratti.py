"""Cataloghi condivisi con il frontend."""
import json
from pathlib import Path
RADICE = Path(__file__).resolve().parents[2]

def leggi_catalogo(nome):
    return json.loads((RADICE / "shared" / f"{nome}.json").read_text(encoding="utf-8"))
