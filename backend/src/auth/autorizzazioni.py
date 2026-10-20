"""Policy amministrative derivate dal catalogo unico dei ruoli."""

from __future__ import annotations

import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.auth.servizio_login import cliente_principale, codice_ruolo
from src.utenti.models import Utente
from src.auth.ruoli import RUOLI_AMMINISTRATIVI, RUOLI_ASSEGNABILI, RUOLI_SENZA_ACCESSO

logger = logging.getLogger("ersaf.auth")

def ruolo_di(db: Session, utente_id: int) -> str | None:
    """Il codice di ruolo di un utente, o None se non ha una riga `clienti`.

    Riusa la scelta deterministica di cliente_principale anche in presenza
    di più anagrafiche collegate allo stesso account.
    """
    cliente = cliente_principale(db, utente_id)
    if cliente is None:
        return None
    return codice_ruolo(db, cliente.cliente_ruolo)


def e_amministrativo(db: Session, utente_id: int) -> bool:
    return (ruolo_di(db, utente_id) or "").lower() in RUOLI_AMMINISTRATIVI


def richiedi_ruolo_amministrativo(
    db: Session, utente: Utente, operazione: str
) -> str:
    """Solleva 403 se l'utente non amministra. Restituisce il suo ruolo.

    `operazione` finisce solo nel log: il messaggio all'utente resta uguale per
    tutte, perche' distinguerlo descriverebbe la mappa dei permessi a chi non
    ne ha.
    """
    ruolo = ruolo_di(db, utente.utente_id)
    if (ruolo or "").lower() not in RUOLI_AMMINISTRATIVI:
        logger.warning(
            "%s negata: utente_id=%s con ruolo=%s non e' amministrativo",
            operazione,
            utente.utente_id,
            ruolo,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non hai i permessi per questa operazione.",
        )
    return ruolo


def richiedi_nazionale(db: Session, utente: Utente, operazione: str) -> str:
    """Solleva 403 se l'utente non e' nazionale. Restituisce il suo ruolo.

    La policy amministrativa ammette anche Business; questa operazione è
    riservata al Nazionale.
    """
    ruolo = (ruolo_di(db, utente.utente_id) or "").lower()
    if ruolo != "nazionale":
        logger.warning(
            "%s negata: utente_id=%s con ruolo=%s non e' nazionale",
            operazione, utente.utente_id, ruolo,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo il nazionale può eseguire questa operazione.",
        )
    return ruolo
