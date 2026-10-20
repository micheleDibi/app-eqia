import logging
from fastapi import HTTPException
from sqlalchemy import update
from src.otp.models import Sfida
from src.notifiche.backend_invio import get_mailer
from src.notifiche.email import carica_template, componi, rendi_html, rendi_oggetto
from src.notifiche.sms import get_sms
from src.otp.identita import destinazione
from src.otp.servizio import genera

logger = logging.getLogger("ersaf.otp")


def manda_email(db, tipo, destinatario, valori):
    oggetto, corpo = carica_template(db, tipo)
    get_mailer().invia(componi(rendi_oggetto(oggetto, valori), rendi_html(corpo, valori), destinatario))


def genera_e_invia(db, contesto, tipo, richiedente):
    cliente, _ = contesto
    recapito, nome = destinazione(cliente, tipo), cliente.cliente_nome
    riga, codice, esito = genera(db, contesto, tipo, richiedente)
    try:
        if tipo == "cellulare":
            get_sms().invia(recapito, f"ERSAF: il codice di verifica e {codice}. Scade tra 10 minuti. Non condividerlo.")
        else:
            template = "login_otp_nazionale" if tipo == "login" else "otp_verifica_email"
            manda_email(db, template, recapito, {"nome": nome,
                        "codice_otp": codice, "scadenza_minuti": "10"})
    except Exception:
        db.execute(update(Sfida).where(Sfida.impronta == riga.impronta, Sfida.stato == "invio").values(stato="fallito"))
        db.commit()
        logger.warning("invio OTP non confermato: tipo=%s", tipo)
        raise HTTPException(503, "Invio del codice non riuscito. Attendi un minuto e riprova.", headers={"Retry-After": "60"}) from None
    db.execute(update(Sfida).where(Sfida.impronta == riga.impronta, Sfida.stato == "invio").values(stato="inviato"))
    db.commit()
    return esito
