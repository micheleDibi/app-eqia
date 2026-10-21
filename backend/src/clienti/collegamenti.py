from fastapi import HTTPException
from sqlalchemy import select

from src.auth.ruoli import RUOLI_ACCESSO
from src.aziende.visibilita import verifica_centro
from src.clienti.lettura import persona, query_persone
from src.clienti.models import Cliente
from src.gestione.contesto import richiedi
from src.utenti.models import Utente


def verifica_padre(ctx, identita, padre):
    if padre is not None:
        riga = query_persone(ctx).filter(Cliente.utente_id == padre,
                                       Cliente.cliente_ruolo.in_(RUOLI_ACCESSO)).first()
        if riga is None:
            raise HTTPException(404, 'Referente non trovato.')
    mappa = dict(ctx.db.execute(select(Utente.utente_id, Utente.utente_padre)
                               .order_by(Utente.utente_id).with_for_update()).all())
    visitati = {identita} if identita else set()
    while padre is not None:
        if padre in visitati:
            raise HTTPException(422, 'Il collegamento creerebbe un ciclo tra gli account.')
        visitati.add(padre)
        padre = mappa.get(padre)


def verifica_collegamenti(ctx, dati, attuale=None):
    verifica_centro(ctx, dati.azienda_id)
    if dati.attuatore_id is not None:
        attuatore = persona(ctx, dati.attuatore_id)
        if attuatore.cliente_ruolo not in RUOLI_ACCESSO:
            raise HTTPException(422, 'Seleziona un attuatore.')
    if attuale is not None and not ctx.nazionale:
        richiedi(dati.padre_utente_id == attuale.utente.utente_padre)
    padre = dati.padre_utente_id if ctx.nazionale else ctx.autore.utente_id
    if attuale is not None and not ctx.nazionale:
        return attuale.utente.utente_padre
    if attuale is None and padre is None:
        padre = ctx.autore.utente_id
    if attuale is None and not ctx.nazionale:
        richiedi(dati.padre_utente_id in (None, ctx.autore.utente_id))
    verifica_padre(ctx, attuale.utente_id if attuale else None, padre)
    return padre
