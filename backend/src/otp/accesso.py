from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from src.auth.accesso import emetti_sessione
from src.auth.servizio_login import cliente_principale, codice_ruolo
from src.database import get_db
from src.mfa.metodi import metodi_disponibili, metodo_di
from src.otp.identita import TIPI_ACCESSO, versione
from src.otp.invio import genera_e_invia
from src.otp.schemas import RichiestaSfida, ConfermaSfida
from src.otp.servizio import blocca_cliente, cerca_sfida, verifica
from src.security.rete import ip_client

router = APIRouter(prefix="/auth")


def contesto_login(db, token):
    """Cliente, utente e tipo di una sfida di accesso (`login` o `email_accesso`).

    Una sfida di verifica contatti avviata dalla scheda cliente (tipo `email`)
    non e' una sfida di accesso: qui viene respinta come non valida.
    """
    sfida = cerca_sfida(db, token)
    cliente, utente = blocca_cliente(db, sfida.cliente_id)
    db.refresh(sfida, with_for_update=True)
    principale = cliente_principale(db, utente.utente_id)
    if (sfida.tipo not in TIPI_ACCESSO or sfida.stato not in {"inviato", "fallito"}
            or sfida.versione != versione(cliente, sfida.tipo, utente)
            or utente.utente_attivoSN != -1 or not principale
            or principale.cliente_id != cliente.cliente_id
            or (codice_ruolo(db, cliente.cliente_ruolo) or "").lower() != "nazionale"):
        raise HTTPException(400, "Verifica non valida. Ripeti l'accesso.")
    if sfida.scadenza <= db.scalar(select(func.now())):
        raise HTTPException(400, "Verifica scaduta. Ripeti l'accesso.")
    return cliente, utente, sfida.tipo


@router.post("/verifica-otp")
def conferma(corpo: ConfermaSfida, request: Request, response: Response, db: Session = Depends(get_db)):
    cliente, utente, tipo = contesto_login(db, corpo.sfida)
    # Con `email_accesso` la conferma certifica anche l'email in otp_contatti,
    # nella stessa transazione in cui nasce la sessione.
    verifica(db, (cliente, utente), (corpo.sfida, corpo.codice), tipo)
    return emetti_sessione(db, utente, "Nazionale", request, response)


@router.post("/rigenera-otp")
def rigenera(corpo: RichiestaSfida, request: Request, db: Session = Depends(get_db)):
    cliente, utente, tipo = contesto_login(db, corpo.sfida)
    esito = genera_e_invia(db, (cliente, utente), tipo, (utente.utente_id, ip_client(request)))
    return {"metodo": metodo_di(tipo), "metodi": metodi_disponibili(db, cliente, utente), **esito}
