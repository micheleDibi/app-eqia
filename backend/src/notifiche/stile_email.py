"""Tema condiviso delle email Equia."""

from src.contratti import leggi_catalogo

IDENTITA = leggi_catalogo("identita")
NOME = IDENTITA["nome"]
COLORI = {
    "primario": "#0157B2", "testo": "#3E4047", "superficie": "#FFFFFF",
    "sfondo": "#f6f9fc", "bordo": "#eef2f7", "tenue": "#6b7280", "riquadro": "#f9fafb",
}
FIRMA = tuple(IDENTITA["firmaEmail"])
STILI_TAG = {
    "p": "margin:0 0 12px;",
    "a": f"color:{COLORI['primario']};overflow-wrap:anywhere;word-break:break-word;",
}
STILI_CLASSI = {
    "email-azione": (
        f"display:inline-block;padding:10px 16px;background:{COLORI['primario']};"
        "color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;"
    ),
    "email-riquadro": (
        f"margin:12px 0;padding:12px 14px;background:{COLORI['riquadro']};"
        f"border:1px solid {COLORI['bordo']};border-radius:6px;"
    ),
    "email-codice": (
        f"margin:0;font-size:28px;font-weight:bold;letter-spacing:6px;color:{COLORI['primario']};"
        "font-family:Menlo,Consolas,monospace;"
    ),
    "email-credenziale": "font-family:Menlo,Consolas,monospace;overflow-wrap:anywhere;word-break:break-word;",
    "email-nota": f"font-size:14px;color:{COLORI['tenue']};",
}
