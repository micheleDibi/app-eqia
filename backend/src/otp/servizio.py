import secrets
from datetime import timedelta
from fastapi import HTTPException
from sqlalchemy import func, select, update
from src.clienti.models import Cliente
from src.utenti.models import Utente
from src.otp.models import Sfida, ContattoVerificato
from src.otp.identita import contatto_di, destinazione, impronta, maschera, versione
from src.otp.limiti import prenota

TTL_SECONDI = 600
TENTATIVI = 5


def blocca_cliente(db, cliente_id):
    utente_id = db.scalar(select(Cliente.utente_id).where(Cliente.cliente_id == cliente_id))
    utente = db.scalar(select(Utente).where(Utente.utente_id == utente_id).with_for_update()
                       .execution_options(populate_existing=True))
    cliente = db.scalar(select(Cliente).where(Cliente.cliente_id == cliente_id).with_for_update()
                        .execution_options(populate_existing=True))
    if not cliente or not utente:
        raise HTTPException(404, "Anagrafica non trovata.")
    return cliente, utente


def genera(db, contesto, tipo, richiedente):
    cliente, utente = contesto
    autore, ip = richiedente
    recapito = destinazione(cliente, tipo)
    ora = db.scalar(select(func.now()))
    prenota(db, (cliente.cliente_id, tipo, autore), ip, ora)
    db.execute(update(Sfida).where(Sfida.cliente_id == cliente.cliente_id, Sfida.tipo == tipo,
                                  Sfida.stato.in_(["inviato", "invio"])).values(stato="superato"))
    token, codice = secrets.token_urlsafe(32), f"{secrets.randbelow(1000000):06d}"
    riga = Sfida(impronta=impronta("sfida:" + token), cliente_id=cliente.cliente_id,
        utente_id=utente.utente_id, autore_id=autore, tipo=tipo, versione=versione(cliente, tipo, utente),
        codice=impronta(f"codice:{token}:{codice}"), stato="invio", tentativi=0,
        creata=ora, scadenza=ora + timedelta(seconds=TTL_SECONDI))
    db.add(riga)
    db.commit()
    return riga, codice, {"sfida": token, "destinatario": maschera(recapito),
                         "durata_secondi": TTL_SECONDI, "reinvia_tra": 60}


def cerca_sfida(db, token):
    riga = db.get(Sfida, impronta("sfida:" + token))
    if not riga:
        raise HTTPException(400, "Verifica non valida. Richiedi un nuovo codice.")
    return riga


def verifica(db, contesto, richiesta, tipo):
    cliente, utente = contesto
    token, codice = richiesta
    riga = db.scalar(select(Sfida).where(Sfida.impronta == impronta("sfida:" + token))
                     .with_for_update().execution_options(populate_existing=True))
    ora = db.scalar(select(func.now()))
    valido = (riga and riga.cliente_id == cliente.cliente_id and riga.utente_id == utente.utente_id
              and riga.tipo == tipo and riga.versione == versione(cliente, tipo, utente)
              and riga.stato == "inviato" and riga.scadenza > ora and riga.tentativi < TENTATIVI)
    if not valido:
        raise HTTPException(400, "Codice non valido o scaduto. Richiedine uno nuovo.")
    riga.tentativi += 1
    if not secrets.compare_digest(riga.codice, impronta(f"codice:{token}:{codice}")):
        db.commit()  # il fallimento consuma davvero un tentativo, anche tra worker
        raise HTTPException(400, "Codice non valido o scaduto. Richiedine uno nuovo.")
    riga.stato = "consumato"
    if tipo != "login":
        # La verifica avviata dal login (`email_accesso`) certifica l'email.
        contatto = contatto_di(tipo)
        db.merge(ContattoVerificato(cliente_id=cliente.cliente_id, tipo=contatto,
                                  versione=versione(cliente, contatto), verificato=ora))
    db.flush()  # commit con l'attivazione o la nuova sessione, mai prima


def gia_verificato(db, cliente, tipo):
    riga = db.get(ContattoVerificato, (cliente.cliente_id, tipo))
    return bool(riga and riga.versione == versione(cliente, tipo))


# Sfide dei metodi da app (totp, passkey): il segreto sta sul telefono e non
# si spedisce nulla, quindi niente limiti d'invio; a frenare i tentativi
# bastano i cinque per sfida e i limiti del login sulla password.
DURATA_SFIDA_APP_SECONDI = 300


def apri_sfida(db, contesto, tipo):
    cliente, utente = contesto
    ora = db.scalar(select(func.now()))
    db.execute(update(Sfida).where(Sfida.cliente_id == cliente.cliente_id, Sfida.tipo == tipo,
                                  Sfida.stato.in_(["inviato", "invio"])).values(stato="superato"))
    token = secrets.token_urlsafe(32)
    riga = Sfida(impronta=impronta("sfida:" + token), cliente_id=cliente.cliente_id,
        utente_id=utente.utente_id, autore_id=utente.utente_id, tipo=tipo,
        versione=versione(cliente, tipo, utente), codice=impronta("nessuno:" + token),
        stato="inviato", tentativi=0, creata=ora, scadenza=ora + timedelta(seconds=DURATA_SFIDA_APP_SECONDI))
    db.add(riga)
    db.commit()
    return riga, {"sfida": token, "durata_secondi": DURATA_SFIDA_APP_SECONDI}


def sfida_app(db, contesto, token, tipo):
    """La sfida da app bloccata per la verifica; 400 se non e' piu' utilizzabile."""
    cliente, utente = contesto
    riga = db.scalar(select(Sfida).where(Sfida.impronta == impronta("sfida:" + token))
                     .with_for_update().execution_options(populate_existing=True))
    ora = db.scalar(select(func.now()))
    valida = (riga and riga.cliente_id == cliente.cliente_id and riga.utente_id == utente.utente_id
              and riga.tipo == tipo and riga.versione == versione(cliente, tipo, utente)
              and riga.stato == "inviato" and riga.scadenza > ora and riga.tentativi < TENTATIVI)
    if not valida:
        raise HTTPException(400, "Verifica non valida o scaduta. Ripeti l'accesso.")
    return riga


def fallisci_tentativo(db, riga):
    riga.tentativi += 1
    db.commit()  # il fallimento consuma davvero un tentativo, anche tra worker
    raise HTTPException(400, "Codice non valido. Riprova.")
