"""Identità e permessi derivati dal catalogo unico Equia."""
from src.contratti import leggi_catalogo
CATALOGO_RUOLI = leggi_catalogo("ruoli")
RUOLI_ACCESSO = frozenset(r["id"] for r in CATALOGO_RUOLI)
RUOLI_SENZA_ACCESSO = frozenset({None, 0, 4, 6})
RUOLI_ELENCO_ATTUATORI = tuple(r["codice"] for r in CATALOGO_RUOLI)
RUOLI_AMMINISTRATIVI = frozenset(r["codice"] for r in CATALOGO_RUOLI if r["amministraAccount"])
RUOLI_ASSEGNABILI = {r["codice"]: frozenset(r["assegna"]) for r in CATALOGO_RUOLI}
