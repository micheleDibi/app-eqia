from fastapi import HTTPException
from sqlalchemy.orm import joinedload

from src.auth.visibilita import filtra_clienti
from src.clienti.models import Cliente
from src.clienti.schemi import CAMPI_PERSONA
from src.gestione.contesto import modifica_persona


def query_persone(ctx, tipo=None):
    query = filtra_clienti(ctx.db.query(Cliente), ctx.vis)
    if tipo == 'attuatore':
        query = query.filter(Cliente.cliente_ruolo.is_not(None))
    elif tipo == 'sottoscrittore':
        query = query.filter(Cliente.cliente_ruolo.is_(None))
    return query.options(joinedload(Cliente.utente), joinedload(Cliente.azienda), joinedload(Cliente.ruolo))


def persona(ctx, identita):
    riga = query_persone(ctx).filter(Cliente.cliente_id == identita).first()
    if riga is None:
        raise HTTPException(404, 'Anagrafica non trovata.')
    return riga


def nominativo(riga):
    return ' '.join(p for p in (riga.cliente_cognome, riga.cliente_nome) if p)


def riferimento_utente(ctx, identita):
    if identita is None:
        return None
    riga = query_persone(ctx).filter(Cliente.utente_id == identita).first()
    return nominativo(riga) if riga else None


def riepilogo(riga):
    return {k: getattr(riga, k) for k in ('cliente_id', 'cliente_nome', 'cliente_cognome',
                                        'cliente_codice_fiscale')} | {
        'attivo': riga.utente.utente_attivoSN == -1,
        'ruolo_nome': riga.ruolo.ruolo_descrizione if riga.ruolo else None,
        'centro_nome': riga.azienda.azienda_ragione_sociale if riga.azienda else None,
    }


def rappresenta(ctx, riga):
    utente = riga.utente
    return {k: getattr(riga, k) for k in CAMPI_PERSONA} | {
        'cliente_id': riga.cliente_id, 'cliente_codice': riga.cliente_codice,
        'tipo': 'attuatore' if riga.cliente_ruolo is not None else 'sottoscrittore',
        'utente_id': riga.utente_id, 'username': utente.utente_username,
        'attivo': utente.utente_attivoSN == -1,
        'ruolo_nome': riga.ruolo.ruolo_descrizione if riga.ruolo else None,
        'centro_nome': riga.azienda.azienda_ragione_sociale if riga.azienda else None,
        'padre_utente_id': utente.utente_padre, 'padre_nome': riferimento_utente(ctx, utente.utente_padre),
        'attuatore_nome': riferimento_cliente(ctx, riga.attuatore_id),
        'email_verificata': riga.email_verificata, 'cellulare_verificato': riga.cellulare_verificato,
        'permessi': {'modifica': modifica_persona(ctx, riga),
                     'ruolo': bool(ctx.assegna) and riga.utente_id != ctx.autore.utente_id,
                     'gerarchia': ctx.nazionale, 'statoAccount': ctx.nazionale},
    }


def riferimento_cliente(ctx, identita):
    if identita is None:
        return None
    riga = query_persone(ctx).filter(Cliente.cliente_id == identita).first()
    return nominativo(riga) if riga else None
