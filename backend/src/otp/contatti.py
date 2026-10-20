from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from src.auth.dipendenze import get_current_utente
from src.auth.visibilita import Visibilita, cliente_visibile_o_404, visibilita_corrente
from src.database import get_db
from src.otp.models import Attivazione
from src.otp.servizio import blocca_cliente, gia_verificato, verifica
from src.otp.invio import genera_e_invia
from src.otp.attivazione import prepara_attivazione, comunica_accesso
from src.otp.schemas import ConfermaSfida
from src.security.rete import ip_client
from src.otp.models import ContattoVerificato
from src.otp.stato_contatti import stato_contatto

router = APIRouter(prefix="/clienti", dependencies=[Depends(get_current_utente)])
Tipo = Literal["email", "cellulare"]
# Il testo di blocca_cliente per un id inesistente: per un non Nazionale un
# cliente non visibile deve ricevere la stessa identica risposta.
NON_TROVATA = "Anagrafica non trovata."


class InvioContatto(BaseModel):
    valore: str = Field(max_length=255)



def stato_contatti(db, cliente, utente):
    righe = {
        r.tipo: r
        for r in db.query(ContattoVerificato)
        .filter(ContattoVerificato.cliente_id == cliente.cliente_id)
        .all()
    }
    attivo = utente.utente_attivoSN == -1

    return {tipo: stato_contatto(cliente, tipo, righe.get(tipo), attivo)
            for tipo in ("email", "cellulare")} | {
        "attivazione": "in_attesa" if db.get(Attivazione, utente.utente_id) else
                       "attivo" if attivo else "disattivato"
    }

@router.get("/{cliente_id}/contatti")
def stato(cliente_id: int, db: Session = Depends(get_db),
          vis: Visibilita = Depends(visibilita_corrente)):
    cliente_visibile_o_404(db, vis, cliente_id, NON_TROVATA)
    cliente, utente = blocca_cliente(db, cliente_id)
    return stato_contatti(db, cliente, utente)


@router.post("/{cliente_id}/contatti/{tipo}/genera-otp")
def genera(cliente_id: int, tipo: Tipo, corpo: InvioContatto, request: Request,
           db: Session = Depends(get_db), autore=Depends(get_current_utente),
           vis: Visibilita = Depends(visibilita_corrente)):
    # Prima di tutto: niente lock, contatori, sfide o invii su un cliente che
    # il chiamante non vede.
    cliente_visibile_o_404(db, vis, cliente_id, NON_TROVATA)
    contesto = blocca_cliente(db, cliente_id)
    if corpo.valore != (getattr(contesto[0], "cliente_" + tipo) or ""):
        raise HTTPException(409, "Il contatto è cambiato. Salva e ricarica la scheda prima della verifica.")
    if gia_verificato(db, contesto[0], tipo):
        raise HTTPException(409, "Il contatto è già verificato.")
    return genera_e_invia(db, contesto, tipo, (autore.utente_id, ip_client(request)))


@router.post("/{cliente_id}/contatti/{tipo}/verifica-otp")
def conferma(cliente_id: int, tipo: Tipo, corpo: ConfermaSfida, db: Session = Depends(get_db),
             vis: Visibilita = Depends(visibilita_corrente)):
    cliente_visibile_o_404(db, vis, cliente_id, NON_TROVATA)
    cliente, utente = blocca_cliente(db, cliente_id)
    verifica(db, (cliente, utente), (corpo.sfida, corpo.codice), tipo)
    credenziali = prepara_attivazione(db, cliente, utente)
    destinatario = cliente.cliente_email
    db.commit()
    inviata = comunica_accesso(db, destinatario, credenziali)
    messaggio = "Contatto verificato."
    if inviata is True:
        messaggio = "Contatti verificati: account attivato e credenziali inviate via email."
    elif inviata is False:
        messaggio = "Account attivato, ma invio delle credenziali non riuscito. Contatta il tuo referente ERSAF."
    return {**stato_contatti(db, cliente, utente), "message": messaggio, "credenziali_inviate": inviata}
