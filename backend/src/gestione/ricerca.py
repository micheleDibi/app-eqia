"""Ricerca letterale e paginazione comuni a persone, centri e selettori."""
from fastapi import Query
from pydantic import BaseModel, Field
from sqlalchemy import or_


class Ricerca(BaseModel):
    search: str = Field(default='', max_length=200)
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=40, ge=1, le=100)


def parametri(search: str = Query('', max_length=200), skip: int = Query(0, ge=0),
              limit: int = Query(40, ge=1, le=100)):
    return Ricerca(search=search, skip=skip, limit=limit)


def cerca(query, testo, colonne):
    for parola in testo.split():
        query = query.filter(or_(*(c.contains(parola, autoescape=True) for c in colonne)))
    return query


def pagina(query, ricerca, serializza):
    totale = query.order_by(None).count()
    elementi = query.offset(ricerca.skip).limit(ricerca.limit).all()
    return {'elementi': [serializza(r) for r in elementi], 'totale': totale,
            'altri': ricerca.skip + len(elementi) < totale}
