from fastapi import APIRouter, Depends

from src.aziende.models import Azienda
from src.aziende.schemi import DatiCentro
from src.aziende.servizio import aggiorna_centro, crea_centro, rappresenta, riepilogo
from src.aziende.visibilita import centro, query_centri
from src.gestione.contesto import contesto, richiedi
from src.gestione.ricerca import cerca, pagina, parametri

router = APIRouter(prefix='/aziende', tags=['Centri'])


@router.get('/')
def elenco(ctx=Depends(contesto), ricerca=Depends(parametri)):
    richiedi(bool(ctx.assegna))
    query = cerca(query_centri(ctx), ricerca.search,
                  (Azienda.azienda_ragione_sociale, Azienda.azienda_partitaIVA, Azienda.azienda_citta))
    return pagina(query.order_by(Azienda.azienda_ragione_sociale, Azienda.azienda_id), ricerca,
                  lambda r: riepilogo(ctx, r))


@router.get('/{azienda_id}')
def dettaglio(azienda_id: int, ctx=Depends(contesto)):
    richiedi(bool(ctx.assegna))
    return rappresenta(ctx, centro(ctx, azienda_id))


@router.get('/{azienda_id}/figli')
def figli(azienda_id: int, ctx=Depends(contesto), ricerca=Depends(parametri)):
    richiedi(bool(ctx.assegna))
    centro(ctx, azienda_id)
    query = query_centri(ctx).filter(Azienda.azienda_padre_id == azienda_id)
    return pagina(query.order_by(Azienda.azienda_ragione_sociale, Azienda.azienda_id), ricerca,
                  lambda r: {'id': r.azienda_id, 'label': r.azienda_ragione_sociale})


@router.post('/', status_code=201)
def crea(dati: DatiCentro, ctx=Depends(contesto)):
    return rappresenta(ctx, crea_centro(ctx, dati))


@router.put('/{azienda_id}')
def modifica(azienda_id: int, dati: DatiCentro, ctx=Depends(contesto)):
    return rappresenta(ctx, aggiorna_centro(ctx, azienda_id, dati))
