"""Centri nella rete: stessa visibilita delle persone, estesa ai sottocentri."""
from fastapi import HTTPException
from sqlalchemy import select

from src.auth.visibilita import filtra_clienti
from src.aziende.models import Azienda
from src.clienti.models import Cliente


def ids_visibili(ctx):
    return ctx.centri_visibili


def calcola_ids_visibili(ctx):
    return ids_centri_visibili(ctx.db, ctx.vis)


def ids_centri_visibili(db, vis):
    if vis.nazionale:
        return None
    persone = filtra_clienti(db.query(Cliente), vis).all()
    utenti = {vis.utente_id, *(p.utente_id for p in persone)}
    radici = {p.azienda_id for p in persone if p.azienda_id is not None}
    righe = db.execute(select(Azienda.azienda_id, Azienda.azienda_padre_id,
                                  Azienda.azienda_created_by)).all()
    radici.update(r.azienda_id for r in righe if r.azienda_created_by in utenti)
    figli = {}
    for riga in righe:
        figli.setdefault(riga.azienda_padre_id, []).append(riga.azienda_id)
    coda = list(radici)
    while coda:
        for figlio in figli.get(coda.pop(), ()):
            if figlio not in radici:
                radici.add(figlio)
                coda.append(figlio)
    return radici


def centro_visibile(db, vis, azienda_id):
    visibili = ids_centri_visibili(db, vis)
    return visibili is None or azienda_id in visibili


def query_centri(ctx):
    query = ctx.db.query(Azienda)
    visibili = ids_visibili(ctx)
    return query if visibili is None else query.filter(Azienda.azienda_id.in_(visibili))


def centro(ctx, identita):
    riga = query_centri(ctx).filter(Azienda.azienda_id == identita).first()
    if riga is None:
        raise HTTPException(404, 'Centro non trovato.')
    return riga


def verifica_centro(ctx, identita):
    if identita is not None:
        centro(ctx, identita)
