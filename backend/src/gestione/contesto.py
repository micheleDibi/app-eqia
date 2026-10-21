"""Contesto e permessi delle anagrafiche, derivati dai cataloghi condivisi."""
from dataclasses import dataclass
from functools import cached_property

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from src.auth.autorizzazioni import ruolo_di
from src.auth.dipendenze import get_current_utente
from src.auth.ruoli import CATALOGO_RUOLI, RUOLI_ASSEGNABILI
from src.auth.visibilita import Visibilita, visibilita_di
from src.database import get_db


@dataclass(frozen=True)
class Gestione:
    db: Session
    autore: object
    ruolo: str
    vis: Visibilita

    @property
    def nazionale(self):
        return self.vis.nazionale

    @cached_property
    def centri_visibili(self):
        from src.aziende.visibilita import calcola_ids_visibili
        return calcola_ids_visibili(self)

    @property
    def assegna(self):
        codici = RUOLI_ASSEGNABILI.get(self.ruolo, ())
        return {r['id'] for r in CATALOGO_RUOLI if r['codice'] in codici}


def contesto(db=Depends(get_db), autore=Depends(get_current_utente)):
    return Gestione(db, autore, ruolo_di(db, autore.utente_id), visibilita_di(db, autore))


def richiedi(condizione):
    if not condizione:
        raise HTTPException(403, 'Non hai i permessi per questa operazione.')


def modifica_persona(ctx, cliente):
    return ctx.nazionale or cliente.cliente_ruolo is None or (
        cliente.cliente_ruolo in ctx.assegna and cliente.utente_id != ctx.autore.utente_id
    )


def verifica_ruolo(ctx, ruolo, tipo):
    if tipo == 'sottoscrittore':
        if ruolo is not None:
            raise HTTPException(422, 'Un sottoscrittore non ha un ruolo di accesso.')
    else:
        richiedi(ruolo in ctx.assegna)
