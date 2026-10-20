"""Attivazione comune dopo la verifica dei contatti."""
import secrets
from sqlalchemy.orm import Session
from src.utenti.models import Utente
from src.auth.models import ATTIVO
from src.security.password import hash_password, verifica_policy_password
def genera_password(nome: str, cognome: str, utente_id: int, username: str) -> str:
    """Password iniziale casuale; mai derivata dai dati anagrafici."""
    from src.config import get_impostazioni
    lunghezza = max(24, get_impostazioni().password_min_length)
    if lunghezza > 72:
        raise ValueError('La lunghezza minima configurata supera il limite bcrypt.')
    while True:
        password = secrets.token_urlsafe(54)[:lunghezza]
        if not verifica_policy_password(password, username=username):
            return password

def attiva_utente_con_password(db: Session, utente: Utente, nome: str, cognome: str) -> str:
    """Genera la password vera e attiva l'account (ATTIVO = -1).

    Va chiamata solo dopo la verifica di email e cellulare. Ritorna la password
    in chiaro, da mandare una sola volta per email: da qui in poi nel
    database resta solo l'hash.
    """
    password_in_chiaro = genera_password(nome, cognome, utente.utente_id, utente.utente_username)
    utente.utente_password_hash = hash_password(password_in_chiaro)
    utente.utente_password_algo = 'bcrypt'
    utente.utente_attivoSN = ATTIVO
    return password_in_chiaro
