"""Un amministratore sintetico, solo per il database di sviluppo Equia."""
import secrets
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
from src import modelli  # noqa: F401
from src.config import get_impostazioni, DIR_BACKEND
from src.database import SessionLocal
from src.inizializzazione import verifica_destinazione
from src.security.password import hash_password
from src.utenti.models import Utente
from src.clienti.models import Cliente
from src.contratti import leggi_catalogo


def main():
    imp = get_impostazioni()
    verifica_destinazione(imp.database_url)
    if imp.ersaf_env != "sviluppo" or "/eqia_dev" not in imp.database_url:
        raise SystemExit("Questo comando richiede il database locale di sviluppo.")
    with SessionLocal.begin() as db:
        if db.scalar(select(Utente.utente_id).limit(1)):
            raise SystemExit("Esiste già un account: nessuna modifica.")
        password = secrets.token_urlsafe(24)
        utente = Utente(utente_username="nazionale.locale", utente_password="",
                        utente_password_hash=hash_password(password), utente_password_algo="bcrypt", utente_attivoSN=-1)
        db.add(utente)
        db.flush()
        ruolo = next(r["id"] for r in leggi_catalogo("ruoli") if r["codice"] == "nazionale")
        cliente = Cliente(utente_id=utente.utente_id, cliente_nome="Giulia", cliente_cognome="Rossi",
                          cliente_email="giulia.rossi@example.org", cliente_ruolo=ruolo)
        db.add(cliente)
    percorso = DIR_BACKEND / "var/accesso-locale.txt"
    percorso.parent.mkdir(parents=True, exist_ok=True)
    percorso.write_text(f"Utente: nazionale.locale\nPassword: {password}\nOTP: var/email_dev\n", encoding="utf-8")
    print("Accesso sintetico creato. Credenziali in backend/var/accesso-locale.txt; OTP su file locale.")


if __name__ == "__main__":
    main()
