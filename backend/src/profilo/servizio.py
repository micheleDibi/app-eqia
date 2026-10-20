"""Lettura dell'anagrafica coerente con l'identità scelta dal login."""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.auth.servizio_login import cliente_principale, codice_ruolo
from src.aziende.models import Azienda
from src.clienti.models import Cliente
from src.profilo.schemas import IndirizzoProfilo, ProfiloPersonale
from src.utenti.models import Utente


def indirizzo_profilo(cliente: Cliente, suffisso: str = "") -> IndirizzoProfilo:
    return IndirizzoProfilo(
        indirizzo=getattr(cliente, f"cliente_indirizzo{suffisso}"),
        civico=getattr(cliente, f"cliente_civico{suffisso}"),
        citta=getattr(cliente, f"cliente_citta{suffisso}"),
        cap=getattr(cliente, f"cliente_CAP{suffisso}"),
        provincia=getattr(cliente, f"cliente_provincia{suffisso}"),
    )


def leggi_profilo(db: Session, utente: Utente) -> ProfiloPersonale:
    principale = cliente_principale(db, utente.utente_id)
    if principale is None:
        raise HTTPException(404, "L'anagrafica del tuo profilo non è disponibile.")
    cliente = db.get(Cliente, principale.cliente_id)
    azienda = db.scalar(select(Azienda.azienda_ragione_sociale).where(Azienda.azienda_id == cliente.azienda_id))
    return ProfiloPersonale(
        username=utente.utente_username,
        ruolo=codice_ruolo(db, cliente.cliente_ruolo),
        nome=cliente.cliente_nome,
        cognome=cliente.cliente_cognome,
        codice_fiscale=cliente.cliente_codice_fiscale,
        cittadinanza=cliente.cliente_cittadinanza,
        email=cliente.cliente_email,
        pec=cliente.cliente_pec,
        telefono=cliente.cliente_telefono,
        cellulare=cliente.cliente_cellulare,
        azienda=azienda,
        residenza=indirizzo_profilo(cliente),
        domicilio=indirizzo_profilo(cliente, "Domicilio"),
    )
