"""Un solo guscio per tutte le notifiche, compatibile con client email."""

from datetime import datetime
from html import escape

from src.notifiche.formato_email import applica_stili
from src.notifiche.stile_email import COLORI as C, FIRMA, NOME


def layout_email(titolo, contenuto):
    anno = datetime.now().year
    firma = "<br>".join(escape(riga) for riga in FIRMA)
    intestazione = titolo.removesuffix(f" — {NOME}")
    return f'''<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(titolo)}</title></head>
<body style="margin:0;padding:0;background:{C['sfondo']};font-family:Arial,Helvetica,sans-serif;color:{C['testo']};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:{C['sfondo']};">
<tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="520"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:{C['superficie']};border-radius:8px;border:1px solid {C['bordo']};box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<tr><td align="center" style="padding:20px 24px;border-bottom:1px solid {C['bordo']};">
<p style="margin:0 0 12px;font-size:24px;font-weight:bold;color:{C['primario']};">{escape(NOME)}</p>
<h1 style="margin:0;font-size:18px;line-height:1.4;color:{C['primario']};">{escape(intestazione)}</h1>
</td></tr>
<tr><td style="padding:20px 24px;font-size:15px;line-height:1.6;overflow-wrap:anywhere;word-break:break-word;">
{applica_stili(contenuto)}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid {C['bordo']};font-size:12px;line-height:1.6;color:{C['tenue']};">
<p style="margin:0 0 8px;">{firma}</p><p style="margin:0;">© {anno} {NOME}</p>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>'''
