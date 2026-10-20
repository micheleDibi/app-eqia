"""Il catalogo dei ruoli è chiuso e condiviso con il frontend."""
from fastapi import APIRouter, Depends
from src.auth.dipendenze import get_current_utente
from src.auth.ruoli import CATALOGO_RUOLI

router = APIRouter(prefix="/ruoli", tags=["Ruoli"], dependencies=[Depends(get_current_utente)])


@router.get("/")
def elenco():
    return [
        {"ruolo_id": r["id"], "ruolo_codice": r["codice"], "ruolo_descrizione": r["nome"]}
        for r in CATALOGO_RUOLI
    ]
