import secrets

from src.account.creazione import crea_account
from src.clienti.collegamenti import verifica_collegamenti
from src.clienti.models import Cliente
from src.clienti.schemi import CAMPI_PERSONA, CAMPI_UNIVOCI
from src.gestione.contesto import verifica_ruolo
from src.gestione.validazione import univoci
from src.otp.models import Attivazione
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
