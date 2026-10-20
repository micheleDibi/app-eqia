"""Account sintetico iniziale per ambienti vuoti, fuori dai flussi applicativi."""
import secrets
from sqlalchemy import select
from src import modelli  # noqa: F401
from src.clienti.models import Cliente
from src.contratti import leggi_catalogo
from src.database import SessionLocal
from src.security.password import hash_password
from src.utenti.models import Utente


def crea_accesso_iniziale(username, percorso):
    percorso.parent.mkdir(parents=True, exist_ok=True)
    if percorso.exists():
        raise ValueError("File di accesso già presente: nessuna modifica.")
    with SessionLocal.begin() as db:
        if db.scalar(select(Utente.utente_id).limit(1)):
            raise ValueError("Esiste già un account: nessuna modifica.")
        password = secrets.token_urlsafe(24)
        utente = Utente(utente_username=username, utente_password="",
                        utente_password_hash=hash_password(password),
                        utente_password_algo="bcrypt", utente_attivoSN=-1)
        db.add(utente)
        db.flush()
        ruolo = next(r["id"] for r in leggi_catalogo("ruoli") if r["codice"] == "nazionale")
        db.add(Cliente(utente_id=utente.utente_id, cliente_nome="Giulia", cliente_cognome="Rossi",
                       cliente_email="giulia.rossi@example.org", cliente_ruolo=ruolo))
        with percorso.open("x", encoding="utf-8") as file:
            file.write(f"Utente: {username}\nPassword: {password}\n")
        percorso.chmod(0o600)
    print("Accesso sintetico creato; credenziali nel file riservato dell'ambiente.")
