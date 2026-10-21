from fastapi import APIRouter, Depends, Query

from src.aziende.models import Azienda
from src.clienti.lettura import persona, query_persone, rappresenta, riepilogo
from src.clienti.models import Cliente
from src.clienti.schemi import DatiPersona, TipoPersona
from src.clienti.servizio import aggiorna_persona, crea_persona
from src.gestione.contesto import contesto, richiedi
from src.gestione.ricerca import cerca, pagina, parametri

router = APIRouter(prefix='/clienti', tags=['Anagrafiche'])


@router.get('/')
def elenco(tipo: TipoPersona, ruolo: int | None = Query(None, gt=0),
           centro: int | None = Query(None, gt=0), ctx=Depends(contesto), ricerca=Depends(parametri)):
    if tipo == 'attuatore':
        richiedi(bool(ctx.assegna))
    query = query_persone(ctx, tipo).outerjoin(Cliente.azienda)
    if ruolo is not None:
        query = query.filter(Cliente.cliente_ruolo == ruolo)
    if centro is not None:
        query = query.filter(Cliente.azienda_id == centro)
    query = cerca(query, ricerca.search, (Cliente.cliente_nome, Cliente.cliente_cognome,
                                         Cliente.cliente_codice_fiscale, Azienda.azienda_ragione_sociale))
    return pagina(query.order_by(Cliente.cliente_cognome, Cliente.cliente_nome, Cliente.cliente_id),
                  ricerca, riepilogo)


@router.get('/{cliente_id}')
def dettaglio(cliente_id: int, ctx=Depends(contesto)):
    riga = persona(ctx, cliente_id)
    if riga.cliente_ruolo is not None:
        richiedi(bool(ctx.assegna))
    return rappresenta(ctx, riga)


@router.post('/', status_code=201)
def crea(tipo: TipoPersona, dati: DatiPersona, ctx=Depends(contesto)):
    return rappresenta(ctx, crea_persona(ctx, tipo, dati))


@router.put('/{cliente_id}')
def modifica(cliente_id: int, dati: DatiPersona, ctx=Depends(contesto)):
    return rappresenta(ctx, aggiorna_persona(ctx, cliente_id, dati))
