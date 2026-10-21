"""Collegamenti dei sottoscrittori, con la stessa visibilità degli elenchi."""
from fastapi import HTTPException

from src.auth.ruoli import RUOLI_ACCESSO
from src.aziende.visibilita import verifica_centro
from src.clienti.lettura import persona, riferimento_cliente


def leggi_collegamenti(ctx, cliente):
    nome = riferimento_cliente(ctx, cliente.attuatore_id)
    return {
        'attuatore_id': cliente.attuatore_id if nome else None,
        'attuatore_nome': nome,
    }


def modifiche_collegamenti(ctx, cliente, inviati):
    collegamenti = {nome: inviati.pop(nome) for nome in ('attuatore_id', 'azienda_id') if nome in inviati}
    if collegamenti and cliente.cliente_ruolo in RUOLI_ACCESSO:
        raise HTTPException(422, 'Questi collegamenti riguardano solo i sottoscrittori.')
    cambiati = {nome: valore for nome, valore in collegamenti.items() if valore != getattr(cliente, nome)}
    if 'azienda_id' in cambiati:
        verifica_centro(ctx, cambiati['azienda_id'])
    if cambiati.get('attuatore_id') is not None:
        attuatore = persona(ctx, cambiati['attuatore_id'])
        if attuatore.cliente_ruolo not in RUOLI_ACCESSO:
            raise HTTPException(422, 'Seleziona un attuatore.')
    return cambiati
