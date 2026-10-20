"""Immagine e allegati di una notizia, nell'archivio (archivio.py) sotto
/Notizie/<prefisso><id>/.

- L'immagine ha un nome casuale di 8 lettere e cifre, senza estensione: il
  tipo si riconosce dai primi byte. Si caricano solo JPG, PNG, GIF e WebP.
- Gli allegati tengono il nome originale; se la notizia ha gia' un allegato
  con lo stesso nome, si aggiungono data e ora del caricamento.
- Leggono tutti quelli che vedono la notizia; caricano e tolgono solo il
  Nazionale. Il file arriva come corpo della richiesta, fino a 10 MB, con il
  nome originale in X-Nome-File (encodeURIComponent).
- Nessun file si cancella dall'archivio: togliere l'immagine o un allegato, o
  eliminare la notizia, toglie solo il nome dal database.
"""

from __future__ import annotations

import logging
import mimetypes
import secrets
import string
from datetime import datetime
from pathlib import PurePosixPath
from typing import Optional
from urllib.parse import quote, unquote

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from src.auth.dipendenze import get_current_utente
from src.auth.visibilita import Visibilita, visibilita_corrente
from src.database import get_db
from src.notizie import dati
from src.notizie.archivio import (
    Archivio, ArchivioNonDisponibile, FileNonTrovato, cartella_notizia, controlla_percorso, get_archivio,
)
from src.notizie.scheda import leggi_scheda, notizia_visibile, solo_nazionale
from src.notizie.schemi import AllegatoNotizia, SchedaNotizia
from src.utenti.models import Utente

logger = logging.getLogger("ersaf.notizie")

router = APIRouter()

MAX_BYTE = 10 * 1024 * 1024
TROPPO_GRANDE = "Il file supera i 10 MB."
VUOTO = "Il file è vuoto."
NON_IMMAGINE = "Si possono caricare solo immagini JPG, PNG, GIF o WebP."
NESSUNA_IMMAGINE = "Questa notizia non ha un'immagine."
ALLEGATO_INESISTENTE = "Allegato non trovato."
FILE_ASSENTE = "Il file non si trova nell'archivio."
ARCHIVIO_NON_DISPONIBILE = "L'archivio dei file non è disponibile. Riprova più tardi."
NOME_PREDEFINITO = "allegato"

_ALFABETO = string.ascii_letters + string.digits


def errore_archivio(errore: Exception) -> HTTPException:
    """503 con un testo generico: il motivo tecnico resta nel log."""
    logger.warning("archivio delle notizie non disponibile: %s", errore)
    return HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, ARCHIVIO_NON_DISPONIBILE)


def tipo_immagine(contenuto: bytes) -> Optional[str]:
    """Il tipo di un'immagine dai primi byte, o None se non e' una delle
    immagini ammesse."""
    if contenuto.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if contenuto.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if contenuto[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if contenuto[:4] == b"RIFF" and contenuto[8:12] == b"WEBP":
        return "image/webp"
    return None


def nome_immagine() -> str:
    """8 lettere e cifre a caso, senza estensione."""
    return "".join(secrets.choice(_ALFABETO) for _ in range(8))


def nome_allegato(originale: str, esistenti: set[str], adesso: datetime) -> str:
    """Il nome del file caricato, senza cartelle e caratteri di controllo.
    Se la notizia ha gia' un allegato con quel nome, "Circolare.pdf" caricato
    alle 15:30 del 16 ottobre 2026 diventa "Circolare_20261016-1530.pdf"."""
    nome = PurePosixPath((originale or "").replace("\\", "/")).name
    nome = "".join(c for c in nome if ord(c) >= 32 and ord(c) != 127).strip()
    if nome in ("", ".", ".."):
        nome = NOME_PREDEFINITO
    percorso = PurePosixPath(nome or NOME_PREDEFINITO)
    radice, estensione = percorso.stem[:150].strip() or NOME_PREDEFINITO, percorso.suffix[:20]
    nome = f"{radice}{estensione}"
    if nome not in esistenti:
        return nome
    candidato = f"{radice}_{adesso:%Y%m%d-%H%M}{estensione}"
    numero = 2
    while candidato in esistenti:
        candidato = f"{radice}_{adesso:%Y%m%d-%H%M}-{numero}{estensione}"
        numero += 1
    return candidato


def percorso_file(notizia_id: int, nome: Optional[str]) -> Optional[str]:
    """Dove sta un file della notizia, o None se il nome manca o non e' un
    semplice nome di file."""
    nome = (nome or "").strip()
    if not nome or "/" in nome:
        return None
    percorso = f"{cartella_notizia(notizia_id)}/{nome}"
    try:
        controlla_percorso(percorso)
    except ValueError:
        return None
    return percorso


def _leggi_archivio(db: Session, archivio: Archivio, percorso: Optional[str], vuoto: str) -> bytes:
    if percorso is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, vuoto)
    db.close()  # la connessione non resta occupata durante il trasferimento
    try:
        return archivio.leggi(percorso)
    except FileNonTrovato:
        raise HTTPException(status.HTTP_404_NOT_FOUND, FILE_ASSENTE) from None
    except (ArchivioNonDisponibile, OSError) as errore:
        raise errore_archivio(errore) from None


async def leggi_corpo(request: Request) -> bytes:
    """Il corpo della richiesta, fermandosi appena supera i 10 MB."""
    dichiarata = request.headers.get("content-length", "")
    if dichiarata.isdigit() and int(dichiarata) > MAX_BYTE:
        raise HTTPException(413, TROPPO_GRANDE)
    parti, totale = [], 0
    async for parte in request.stream():
        totale += len(parte)
        if totale > MAX_BYTE:
            raise HTTPException(413, TROPPO_GRANDE)
        parti.append(parte)
    contenuto = b"".join(parti)
    if not contenuto:
        raise HTTPException(422, VUOTO)
    return contenuto


def _controlla_scrittura(db: Session, vis: Visibilita, utente: Utente, notizia_id: int) -> None:
    """Controllo leggero, senza blocco, prima di ricevere il file: lo stesso
    si ripete sotto blocco al salvataggio."""
    solo_nazionale(vis)
    notizia_visibile(db, vis, utente, notizia_id)


def _scrivi(db: Session, archivio: Archivio, percorso: str, contenuto: bytes) -> None:
    try:
        archivio.scrivi(percorso, contenuto)
    except (ArchivioNonDisponibile, OSError) as errore:
        db.rollback()
        raise errore_archivio(errore) from None


# =============================================================================
# Immagine
# =============================================================================
@router.get("/{notizia_id}/immagine")
def scarica_immagine(
    notizia_id: int,
    db: Session = Depends(get_db),
    vis: Visibilita = Depends(visibilita_corrente),
    utente: Utente = Depends(get_current_utente),
    archivio: Archivio = Depends(get_archivio),
):
    riga = notizia_visibile(db, vis, utente, notizia_id)
    contenuto = _leggi_archivio(db, archivio, percorso_file(notizia_id, riga["notizia_immagine_filename"]),
                                NESSUNA_IMMAGINE)
    tipo = tipo_immagine(contenuto)
    if tipo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NESSUNA_IMMAGINE)
    return Response(content=contenuto, media_type=tipo, headers={
        "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    })


def _salva_immagine(db: Session, vis: Visibilita, utente: Utente, archivio: Archivio, notizia_id: int,
                    contenuto: bytes) -> SchedaNotizia:
    notizia_visibile(db, vis, utente, notizia_id, blocca=True)
    solo_nazionale(vis)
    nome = nome_immagine()
    _scrivi(db, archivio, f"{cartella_notizia(notizia_id)}/{nome}", contenuto)
    dati.imposta_immagine(db, notizia_id, nome, utente.utente_id, datetime.now())
    db.commit()
    return leggi_scheda(db, vis, dati.notizia(db, notizia_id))


@router.put("/{notizia_id}/immagine", response_model=SchedaNotizia)
async def carica_immagine(
    notizia_id: int,
    request: Request,
    db: Session = Depends(get_db),
    vis: Visibilita = Depends(visibilita_corrente),
    utente: Utente = Depends(get_current_utente),
    archivio: Archivio = Depends(get_archivio),
):
    await run_in_threadpool(_controlla_scrittura, db, vis, utente, notizia_id)
    await run_in_threadpool(db.rollback)  # nessuna transazione aperta durante l'upload
    if not request.headers.get("content-type", "").lower().startswith("image/"):
        raise HTTPException(415, NON_IMMAGINE)
    contenuto = await leggi_corpo(request)
    if tipo_immagine(contenuto) is None:
        raise HTTPException(415, NON_IMMAGINE)
    return await run_in_threadpool(_salva_immagine, db, vis, utente, archivio, notizia_id, contenuto)


@router.delete("/{notizia_id}/immagine", response_model=SchedaNotizia)
def togli_immagine(
    notizia_id: int,
    db: Session = Depends(get_db),
    vis: Visibilita = Depends(visibilita_corrente),
    utente: Utente = Depends(get_current_utente),
):
    solo_nazionale(vis)
    notizia_visibile(db, vis, utente, notizia_id, blocca=True)
    dati.imposta_immagine(db, notizia_id, None, utente.utente_id, datetime.now())
    db.commit()
    return leggi_scheda(db, vis, dati.notizia(db, notizia_id))


# =============================================================================
# Allegati
# =============================================================================
def _allegato_visibile(db: Session, vis: Visibilita, utente: Utente, notizia_id: int, allegato_id: int, *,
                       blocca: bool = False) -> dict:
    notizia_visibile(db, vis, utente, notizia_id, blocca=blocca)
    riga = dati.allegato(db, notizia_id, allegato_id)
    if riga is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, ALLEGATO_INESISTENTE)
    return riga


@router.get("/{notizia_id}/allegati/{allegato_id}")
def scarica_allegato(
    notizia_id: int,
    allegato_id: int,
    db: Session = Depends(get_db),
    vis: Visibilita = Depends(visibilita_corrente),
    utente: Utente = Depends(get_current_utente),
    archivio: Archivio = Depends(get_archivio),
):
    nome = _allegato_visibile(db, vis, utente, notizia_id, allegato_id)["notizia_allegato_nome_file"]
    contenuto = _leggi_archivio(db, archivio, percorso_file(notizia_id, nome), FILE_ASSENTE)
    ascii_ = nome.encode("ascii", "ignore").decode().replace('"', "").replace("\\", "") or NOME_PREDEFINITO
    return Response(
        content=contenuto,
        media_type=mimetypes.guess_type(nome)[0] or "application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename=\"{ascii_}\"; filename*=UTF-8''{quote(nome, safe='')}",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


def _salva_allegato(db: Session, vis: Visibilita, utente: Utente, archivio: Archivio, notizia_id: int,
                    originale: str, contenuto: bytes) -> AllegatoNotizia:
    notizia_visibile(db, vis, utente, notizia_id, blocca=True)
    solo_nazionale(vis)
    adesso = datetime.now()
    esistenti = {a["notizia_allegato_nome_file"] for a in dati.allegati(db, notizia_id)}
    nome = nome_allegato(originale, esistenti, adesso)
    _scrivi(db, archivio, f"{cartella_notizia(notizia_id)}/{nome}", contenuto)
    allegato_id = dati.aggiungi_allegato(db, notizia_id, nome, utente.utente_id, adesso)
    db.commit()
    return AllegatoNotizia(notizia_allegato_id=allegato_id, notizia_allegato_nome_file=nome)


@router.post("/{notizia_id}/allegati", response_model=AllegatoNotizia, status_code=status.HTTP_201_CREATED)
async def carica_allegato(
    notizia_id: int,
    request: Request,
    db: Session = Depends(get_db),
    vis: Visibilita = Depends(visibilita_corrente),
    utente: Utente = Depends(get_current_utente),
    archivio: Archivio = Depends(get_archivio),
):
    await run_in_threadpool(_controlla_scrittura, db, vis, utente, notizia_id)
    await run_in_threadpool(db.rollback)  # nessuna transazione aperta durante l'upload
    originale = unquote(request.headers.get("x-nome-file", ""))
    contenuto = await leggi_corpo(request)
    return await run_in_threadpool(_salva_allegato, db, vis, utente, archivio, notizia_id, originale, contenuto)


@router.delete("/{notizia_id}/allegati/{allegato_id}", status_code=status.HTTP_204_NO_CONTENT)
def togli_allegato(
    notizia_id: int,
    allegato_id: int,
    db: Session = Depends(get_db),
    vis: Visibilita = Depends(visibilita_corrente),
    utente: Utente = Depends(get_current_utente),
):
    solo_nazionale(vis)
    _allegato_visibile(db, vis, utente, notizia_id, allegato_id, blocca=True)
    dati.togli_allegato(db, notizia_id, allegato_id, utente.utente_id, datetime.now())
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
