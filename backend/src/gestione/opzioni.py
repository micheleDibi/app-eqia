"""Selettori paginati: solo identificativi e nomi, limitati alla rete."""
from fastapi import APIRouter, Depends, Query

from src.aziende.models import Azienda
from src.aziende.visibilita import query_centri
from src.clienti.lettura import nominativo, query_persone
from src.clienti.models import Cliente
from src.gestione.contesto import contesto
from src.gestione.ricerca import cerca, pagina, parametri

router = APIRouter(prefix='/anagrafiche/opzioni', tags=['Selezioni'])


@router.get('/centri')
def centri(id: int | None = Query(None, gt=0), ctx=Depends(contesto), ricerca=Depends(parametri)):
    query = cerca(query_centri(ctx), ricerca.search, (Azienda.azienda_ragione_sociale,))
    if id is not None:
        query = query.filter(Azienda.azienda_id == id)
    return pagina(query.order_by(Azienda.azienda_ragione_sociale, Azienda.azienda_id), ricerca,
                  lambda r: {'id': r.azienda_id, 'label': r.azienda_ragione_sociale})


@router.get('/attuatori')
def attuatori(ctx=Depends(contesto), ricerca=Depends(parametri)):
    query = cerca(query_persone(ctx, 'attuatore'), ricerca.search,
                  (Cliente.cliente_cognome, Cliente.cliente_nome))
    return pagina(query.order_by(Cliente.cliente_cognome, Cliente.cliente_nome, Cliente.cliente_id),
                  ricerca, lambda r: {'id': r.cliente_id, 'utente_id': r.utente_id, 'label': nominativo(r)})
