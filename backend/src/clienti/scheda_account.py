"""Validazione di username e referente nella scheda anagrafica."""
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.auth.ruoli import RUOLI_ACCESSO
from src.auth.servizio_login import cliente_principale
from src.utenti.models import Utente

USERNAME_USATO = "Esiste già un utente registrato con questo username."
SOLO_NAZIONALE_ACCOUNT = "Solo il Nazionale può cambiare il nome utente o l'utente padre."


def modifiche_account(db, utente, vis, inviati):
    account = {}
    for colonna in ('utente_username', 'utente_padre'):
        if colonna in inviati:
            valore = inviati.pop(colonna)
            if valore != getattr(utente, colonna):
                account[colonna] = valore
    if account and not vis.nazionale:
        raise HTTPException(status.HTTP_403_FORBIDDEN, SOLO_NAZIONALE_ACCOUNT)
    if 'utente_username' in account:
        account['utente_username'] = controlla_username(db, utente, account['utente_username'])
    if 'utente_padre' in account:
        account['utente_padre'] = controlla_padre(db, utente, account['utente_padre'])
    return account


def controlla_username(db: Session, utente: Utente, valore: str | None) -> str:
    """Il nome utente nuovo, o HTTPException. Il confronto dei doppioni lo fa
    il database, con la regola del login: maiuscole, minuscole e accenti non
    contano (account/creazione.py, migrazione 018)."""
    valore = (valore or "").strip()
    if not valore:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Il nome utente non può essere vuoto.")
    altro = db.scalar(select(Utente.utente_id).where(
        Utente.utente_username == valore, Utente.utente_id != utente.utente_id).limit(1))
    if altro is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, USERNAME_USATO)
    return valore


def controlla_padre(db: Session, utente: Utente, padre_id: int | None) -> int:
    """Il padre nuovo, o HTTPException: un attuatore esistente, non l'utente
    stesso e non uno che gia' ne dipende, che chiuderebbe un giro nella
    catena su cui si regge la visibilita'."""
    if padre_id == utente.utente_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Un utente non può essere padre di se stesso.")
    riga = cliente_principale(db, padre_id) if padre_id is not None else None
    if riga is None or riga.cliente_ruolo not in RUOLI_ACCESSO:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "L'utente padre deve essere un attuatore.")
    mappa = dict(db.execute(select(Utente.utente_id, Utente.utente_padre)
                            .order_by(Utente.utente_id).with_for_update()).all())
    visti, corrente = set(), padre_id
    while corrente is not None and corrente not in visti:
        if corrente == utente.utente_id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT,
                                "L'attuatore scelto dipende già da questo utente: non può esserne il padre.")
        visti.add(corrente)
        corrente = mappa.get(corrente)
    return padre_id
