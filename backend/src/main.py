"""Applicazione Equia."""
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from src import modelli  # noqa: F401
from src.config import get_impostazioni, verifica_configurazione
from src.contratti import leggi_catalogo
from src.logging_config import configura_logging
from src.notifiche.config_sms import ConfigSMS
from src.rotte import ROUTER
from src.security.browser import verifica_richiesta_browser

logger = logging.getLogger("eqia")


@asynccontextmanager
async def lifespan(app):
    imp = get_impostazioni()
    configura_logging(imp)
    verifica_configurazione(imp)
    ConfigSMS().verifica()
    yield


app = FastAPI(title=leggi_catalogo("identita")["titolo"], lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=get_impostazioni().lista_cors_origins,
    allow_credentials=True, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-EQIA-Request", "X-CSRF-Token"],
    expose_headers=["Retry-After"],
)


@app.middleware("http")
async def proteggi_browser(request: Request, call_next):
    try:
        verifica_richiesta_browser(request)
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    risposta = await call_next(request)
    risposta.headers["Cache-Control"] = "no-store"
    risposta.headers["X-Content-Type-Options"] = "nosniff"
    risposta.headers["Referrer-Policy"] = "no-referrer"
    return risposta


@app.exception_handler(RequestValidationError)
async def validazione(request, exc):
    messaggi = list(dict.fromkeys(
        e.get("msg", "Dati non validi.").removeprefix("Value error, ") for e in exc.errors()
    ))
    return JSONResponse(status_code=422, content={"detail": "; ".join(messaggi)})


@app.exception_handler(IntegrityError)
async def integrita(request, exc):
    logger.warning("Vincolo dati: %s %s", request.method, request.url.path)
    return JSONResponse(status_code=409, content={"detail": "I dati violano un vincolo di integrità."})


@app.exception_handler(SQLAlchemyError)
async def database_non_disponibile(request, exc):
    logger.exception("Errore database")
    return JSONResponse(status_code=500, content={"detail": "Errore interno. Riprova."})


for router in ROUTER:
    app.include_router(router)


@app.get("/salute", tags=["Servizio"])
def salute():
    return {"stato": "ok"}
