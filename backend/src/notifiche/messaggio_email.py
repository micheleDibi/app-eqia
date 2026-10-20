"""MIME condiviso: testo leggibile, HTML e logo incorporato senza download."""

from datetime import datetime
from email.message import EmailMessage

from src.notifiche.formato_email import come_testo
from src.notifiche.layout_email import layout_email
from src.notifiche.stile_email import FIRMA, NOME


def crea_messaggio(oggetto, corpo_html, destinatario, mittente):
    messaggio = EmailMessage()
    messaggio["From"] = mittente
    messaggio["To"] = destinatario
    messaggio["Subject"] = oggetto
    firma = "\n".join(FIRMA)
    messaggio.set_content(f"{oggetto}\n\n{come_testo(corpo_html)}\n\n{firma}\n© {datetime.now().year} {NOME}\n")
    messaggio.add_alternative(layout_email(oggetto, corpo_html), subtype="html")
    return messaggio
