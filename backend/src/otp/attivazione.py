import logging
from src.config import get_impostazioni
from src.otp.models import Attivazione
from src.otp.servizio import gia_verificato
from src.otp.invio import manda_email
from src.auth.autorizzazioni import RUOLI_SENZA_ACCESSO

logger = logging.getLogger("ersaf.otp")


def prepara_attivazione(db, cliente, utente):
    attesa = db.get(Attivazione, utente.utente_id)
    if not attesa or attesa.cliente_id != cliente.cliente_id or utente.utente_attivoSN != 0:
        return None
    if not all(gia_verificato(db, cliente, tipo) for tipo in ("email", "cellulare")):
        return None
    from src.account.attivazione import attiva_utente_con_password
    password = attiva_utente_con_password(db, utente, cliente.cliente_nome, cliente.cliente_cognome)
    db.delete(attesa)
    istruzioni = "Le credenziali saranno utilizzabili nei servizi abilitati per il tuo profilo."
    if cliente.cliente_ruolo not in RUOLI_SENZA_ACCESSO:
        istruzioni = "Puoi accedere alla piattaforma da " + get_impostazioni().frontend_base_url
    return {"nome": cliente.cliente_nome, "username": utente.utente_username,
            "password": password, "istruzioni_accesso": istruzioni}


def comunica_accesso(db, destinatario, valori):
    if valori is None:
        return None
    try:
        manda_email(db, "credenziali_accesso", destinatario, valori)
        return True
    except Exception:
        logger.warning("email di accesso non confermata, usare recupero password")
        return False
