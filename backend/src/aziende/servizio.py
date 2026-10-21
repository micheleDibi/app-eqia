import secrets

from fastapi import HTTPException
from sqlalchemy import select

from src.aziende.models import Azienda
from src.aziende.schemi import CAMPI_UNIVOCI, DatiCentro
from src.aziende.visibilita import verifica_centro
from src.gestione.contesto import richiedi
from src.gestione.validazione import univoci


def verifica_gerarchia(ctx, identita, padre):
    verifica_centro(ctx, padre)
    mappa = dict(ctx.db.execute(select(Azienda.azienda_id, Azienda.azienda_padre_id)
                               .order_by(Azienda.azienda_id).with_for_update()).all())
    visitati = {identita} if identita is not None else set()
    while padre is not None:
        if padre in visitati:
            raise HTTPException(422, 'Il collegamento creerebbe un ciclo tra i centri.')
        visitati.add(padre)
        padre = mappa.get(padre)


def crea_centro(ctx, dati):
    richiedi(bool(ctx.assegna))
    valori = dati.model_dump()
    verifica_gerarchia(ctx, None, valori['azienda_padre_id'])
    univoci(ctx.db, Azienda, {k: valori[k] for k in CAMPI_UNIVOCI})
    riga = Azienda(**valori, azienda_created_by=ctx.autore.utente_id,
                   azienda_codice_nazionale=secrets.token_hex(11))
    ctx.db.add(riga)
    ctx.db.commit()
    return riga


def rappresenta(ctx, riga):
    padre = riga.padre
    visibili = ctx.centri_visibili
    padre_visibile = padre and (visibili is None or padre.azienda_id in visibili)
    return {k: getattr(riga, k) for k in DatiCentro.model_fields} | {
        'azienda_id': riga.azienda_id, 'azienda_codice_nazionale': riga.azienda_codice_nazionale,
        'padre_nome': padre.azienda_ragione_sociale if padre_visibile else None,
        'permessi': {'modifica': bool(ctx.assegna), 'identita': ctx.nazionale, 'gerarchia': ctx.nazionale},
    }


def riepilogo(ctx, riga):
    dati = rappresenta(ctx, riga)
    return {k: dati[k] for k in ('azienda_id', 'azienda_ragione_sociale', 'azienda_partitaIVA',
                                'azienda_citta', 'azienda_provincia', 'padre_nome')}
