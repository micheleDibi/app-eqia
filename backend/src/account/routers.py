"""Stato dell'account di un'anagrafica: attivo o disattivo.

- Lo cambia solo il Nazionale, anche sulla propria anagrafica.
- Un utente disattivato non entra, e le sue sessioni aperte smettono di
  valere alla richiesta successiva (security/sessioni.py).
- Il cambio di stato chiude l'attesa di attivazione: verificare poi i
  contatti non attiva piu' l'account. Attivare a mano non spedisce
  credenziali: la password resta un valore che nessuno conosce, e la persona
  ne imposta una con il recupero della password.
- Uno stato uguale a quello attuale non cambia nulla, nemmeno l'attesa.

Risponde come GET /clienti/{id}/contatti, cosi' la sezione account si
aggiorna con una sola richiesta.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.auth.dipendenze import get_current_utente
from src.auth.models import ATTIVO, DISATTIVO, MotivoRevoca
from src.auth.visibilita import Visibilita, cliente_visibile_o_404, visibilita_corrente
from src.database import get_db
from src.otp.contatti import NON_TROVATA, stato_contatti
from src.otp.models import Attivazione
from src.otp.servizio import blocca_cliente
from src.security.sessioni import revoca_sessioni_utente
from src.utenti.models import Utente

SOLO_NAZIONALE = "Solo il Nazionale può eseguire questa operazione."

router = APIRouter(prefix="/clienti", tags=["Account"], dependencies=[Depends(get_current_utente)])


class StatoAccount(BaseModel):
    attivo: bool


@router.put("/{cliente_id}/account/stato")
def cambia_stato(cliente_id: int, corpo: StatoAccount, db: Session = Depends(get_db),
                 vis: Visibilita = Depends(visibilita_corrente), autore: Utente = Depends(get_current_utente)):
    if not vis.nazionale:
        raise HTTPException(status.HTTP_403_FORBIDDEN, SOLO_NAZIONALE)
    cliente_visibile_o_404(db, vis, cliente_id, NON_TROVATA)
    cliente, utente = blocca_cliente(db, cliente_id)
    nuovo = ATTIVO if corpo.attivo else DISATTIVO
    if utente.utente_attivoSN != nuovo:
        utente.utente_attivoSN = nuovo
        utente.utente_updated_by = autore.utente_id
        if nuovo == DISATTIVO:
            revoca_sessioni_utente(db, utente.utente_id, MotivoRevoca.UTENTE_DISATTIVATO)
        attesa = db.get(Attivazione, utente.utente_id)
        if attesa is not None:
            db.delete(attesa)
    db.commit()
    return stato_contatti(db, cliente, utente)
