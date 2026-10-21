import secrets

from src.account.creazione import crea_account
from src.auth.models import MotivoRevoca
from src.clienti.collegamenti import verifica_collegamenti
from src.clienti.lettura import persona
from src.clienti.models import Cliente
from src.clienti.schemi import CAMPI_PERSONA, CAMPI_UNIVOCI
from src.gestione.contesto import modifica_persona, richiedi, verifica_ruolo
from src.gestione.validazione import univoci
from src.otp.models import Attivazione
from src.security.sessioni import revoca_sessioni_utente
from src.utenti.models import Utente


def crea_persona(ctx, tipo, dati):
    verifica_ruolo(ctx, dati.cliente_ruolo, tipo)
    padre = verifica_collegamenti(ctx, dati)
    valori = dati.model_dump(include=set(CAMPI_PERSONA))
    univoci(ctx.db, Cliente, {k: valori[k] for k in CAMPI_UNIVOCI})
    identita = crea_account(ctx.db, nome=dati.cliente_nome, cognome=dati.cliente_cognome,
                           autore_id=ctx.autore.utente_id)
    ctx.db.get(Utente, identita).utente_padre = padre
    riga = Cliente(**valori, utente_id=identita, cliente_codice=secrets.token_hex(10).upper())
    ctx.db.add(riga)
    ctx.db.flush()
    ctx.db.add(Attivazione(utente_id=identita, cliente_id=riga.cliente_id))
    ctx.db.commit()
    return riga


def aggiorna_persona(ctx, identita, dati):
    riga = persona(ctx, identita)
    richiedi(modifica_persona(ctx, riga))
    tipo = 'attuatore' if riga.cliente_ruolo is not None else 'sottoscrittore'
    verifica_ruolo(ctx, dati.cliente_ruolo, tipo)
    padre = verifica_collegamenti(ctx, dati, riga)
    richiedi(riga.utente_id != ctx.autore.utente_id or dati.cliente_ruolo == riga.cliente_ruolo)
    valori = dati.model_dump(include=set(CAMPI_PERSONA))
    univoci(ctx.db, Cliente, {k: valori[k] for k in CAMPI_UNIVOCI}, identita)
    if riga.cliente_ruolo != dati.cliente_ruolo:
        revoca_sessioni_utente(ctx.db, riga.utente_id, MotivoRevoca.ADMIN)
    for nome, valore in valori.items():
        setattr(riga, nome, valore)
    riga.utente.utente_padre = padre
    riga.utente.utente_updated_by = ctx.autore.utente_id
    ctx.db.commit()
    return riga
