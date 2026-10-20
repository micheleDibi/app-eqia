"""Trasporto della sessione e protezione delle richieste browser."""

import hashlib
import hmac
from urllib.parse import urlsplit

from fastapi import HTTPException, Request, Response

from src.config import get_impostazioni

HEADER_RICHIESTA = "x-eqia-request"
HEADER_CSRF = "x-csrf-token"
METODI_LETTURA = frozenset({"GET", "HEAD", "OPTIONS"})


def cookie_sicuro() -> bool:
    imp = get_impostazioni()
    return imp.ersaf_env == "produzione" or imp.frontend_base_url.startswith("https://")


def nome_cookie() -> str:
    return "__Host-eqia_sessione" if cookie_sicuro() else "eqia_sessione"


def token_richiesta(request: Request) -> str | None:
    # Authorization non costituisce piu' un trasporto alternativo del token.
    return request.cookies.get(nome_cookie())


def token_csrf(token: str) -> str:
    chiave = get_impostazioni().session_token_pepper.encode("utf-8")
    return hmac.new(chiave, b"csrf-sessione\0" + token.encode("utf-8"), hashlib.sha256).hexdigest()


def imposta_cookie(response: Response, token: str) -> None:
    # Max-Age pari alla finestra di inattivita': viene rimandato a ogni rinnovo
    # lato server, cosi' browser e database scadono insieme (ADR 0008).
    response.set_cookie(
        nome_cookie(), token, httponly=True, secure=cookie_sicuro(),
        samesite="lax", path="/",
        max_age=get_impostazioni().session_inattivita_giorni * 86400,
    )
    response.headers["Cache-Control"] = "no-store"


def cancella_cookie(response: Response) -> None:
    response.delete_cookie(nome_cookie(), path="/", secure=cookie_sicuro(), httponly=True, samesite="lax")
    response.headers["Cache-Control"] = "no-store"


def origine_url(url: str) -> str:
    parti = urlsplit(url)
    return f"{parti.scheme}://{parti.netloc}"


def verifica_richiesta_browser(request: Request) -> None:
    if request.method in METODI_LETTURA:
        return
    imp = get_impostazioni()
    consentite = {origine_url(imp.frontend_base_url), *imp.lista_cors_origins}
    origine = request.headers.get("origin")
    if origine is not None and origine not in consentite:
        raise HTTPException(403, "Origine della richiesta non consentita.")
    # Anche login/reset senza sessione richiedono una richiesta non semplice.
    # Una pagina estranea deve superare il preflight CORS per questo header.
    if request.headers.get(HEADER_RICHIESTA) != "1":
        raise HTTPException(403, "Richiesta non valida. Ricarica la pagina.")
    if request.headers.get("sec-fetch-site") == "cross-site" and origine not in consentite:
        raise HTTPException(403, "Origine della richiesta non consentita.")


def verifica_csrf(request: Request, token: str) -> None:
    if request.method in METODI_LETTURA:
        return
    ricevuto = request.headers.get(HEADER_CSRF, "")
    if not hmac.compare_digest(ricevuto.encode("utf-8"), token_csrf(token).encode("ascii")):
        raise HTTPException(403, detail={
            "codice": "csrf_non_valido",
            "messaggio": "La sessione è cambiata. Ricarica la pagina prima di riprovare.",
        })
