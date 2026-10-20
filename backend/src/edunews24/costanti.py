"""Costanti del modulo EduNews24: numeri, percorsi a monte, regioni, messaggi.

Nessun valore reale: indirizzo dell'API, host dei media e contatto arrivano
dalla configurazione (EDUNEWS24_*, predefiniti in config.py). Gli host qui sotto
sono inventati (RFC 6761) e servono al backend `memoria` e ai test.
"""

from __future__ import annotations

# --- protezioni del threadpool e flusso -------------------------------------
# Thread del modulo che possono chiamare o aspettare EduNews24 insieme, su
# circa 40 del threadpool condiviso con tutte le rotte (e con /salute).
POSTI_SEMAFORO = 4
# Attesa massima di chi segue una chiamata gia' in volo sulla stessa chiave.
ATTESA_VOLO_SECONDI = 1.5
# Retry-After dei 503 dovuti al carico (semaforo pieno, attesa scaduta).
RETRY_BREVE_SECONDI = 5
PAUSA_MASSIMA_SECONDI = 3600
FINESTRA_BUDGET_SECONDI = 60
VOCI_LETTE_MASSIME = 100
CATEGORIE_MASSIME = 50
CURSORI_MASSIMI = 2048

# --- cache ------------------------------------------------------------------
# 96 voci x 192 KiB misurati come JSON, con un tetto totale di 6 MiB: in
# oggetti Python restano sotto i 32 MB anche nel caso peggiore.
VOCI_CACHE_MASSIME = 96
VOCE_CACHE_MASSIMA_BYTE = 196_608
CACHE_TOTALE_MASSIMA_BYTE = 6_291_456
FRESCHEZZA_MASSIMA_SECONDI = 3600
SWR_MASSIMO_SECONDI = 3600
SIE_MASSIMO_SECONDI = 86_400
# Freschezza di una copia marcata STALE a monte senza s-maxage.
FRESCHEZZA_STANTIA_SECONDI = 60

# --- client -----------------------------------------------------------------
# Tetto sui byte del corpo, sia grezzi sia gia' decompressi.
TETTO_BYTE = 1_048_576
LUNGHEZZA_MASSIMA_ETAG = 128
LUNGHEZZA_MASSIMA_URL = 1024
LUNGHEZZA_MASSIMA_LINK = 2048

# Nessun numero di versione del backend: l'1.0 e' fisso. Contatto facoltativo.
USER_AGENT = "PiattaformaUniversita/1.0"
USER_AGENT_CON_CONTATTO = USER_AGENT + " (+{contatto})"

# --- risorse a monte --------------------------------------------------------
PERCORSI = {
    "notizie": "/articles",
    "interpelli": "/interpelli",
    "selezione-personale": "/selezione-personale",
    "bandi": "/bandi",
    "categorie": "/categories",
}
CHIAVE_CATEGORIE = "/categories"

# Segnaposto delle immagini da sostituire: si scarta su qualunque host.
PERCORSO_SEGNAPOSTO = "/edunews24_immagine_da_sostituire.png"
# Il mov non e' riprodotto in modo affidabile da tutti i browser, e un MIME
# assente non si indovina: il player esiste solo per questi due.
MIME_VIDEO = frozenset({"video/mp4", "video/webm"})

# Suffissi di rete interna, gli stessi di scripts/documentazione/comune.py,
# piu' localhost.
SUFFISSI_INTERNI = (
    "local", "lan", "internal", "intranet", "corp", "localdomain", "priv", "home", "localhost",
)

# Host inventati del backend `memoria` (e dei test).
HOST_SITO_MEMORIA = "edunews24.invalid"
HOST_MEDIA_MEMORIA = "media.edunews24.invalid"

# Le 20 regioni di EduNews24 (slug, nome), nell'ordine del registro del sito.
# Il frontend ne ha una copia in config/edunews24.js: un test le confronta.
REGIONI: tuple[tuple[str, str], ...] = (
    ("abruzzo", "Abruzzo"),
    ("basilicata", "Basilicata"),
    ("calabria", "Calabria"),
    ("campania", "Campania"),
    ("emilia-romagna", "Emilia-Romagna"),
    ("friuli-venezia-giulia", "Friuli-Venezia Giulia"),
    ("lazio", "Lazio"),
    ("liguria", "Liguria"),
    ("lombardia", "Lombardia"),
    ("marche", "Marche"),
    ("molise", "Molise"),
    ("piemonte", "Piemonte"),
    ("puglia", "Puglia"),
    ("sardegna", "Sardegna"),
    ("sicilia", "Sicilia"),
    ("toscana", "Toscana"),
    ("trentino-alto-adige", "Trentino-Alto Adige"),
    ("umbria", "Umbria"),
    ("valle-d-aosta", "Valle d'Aosta"),
    ("veneto", "Veneto"),
)

# --- messaggi verso il browser ----------------------------------------------
MESSAGGIO_NON_DISPONIBILE = "EduNews24 non è raggiungibile in questo momento. Riprova più tardi."
MESSAGGIO_CURSORE = "L'elenco di EduNews24 è cambiato: ricarica dalla prima pagina."
MESSAGGIO_CATEGORIA = "Categoria sconosciuta."
MESSAGGIO_AREA = "L'area nazionale non è disponibile per gli interpelli."
