"""Creazione interna dell'account (V1): la chiama la creazione dell'anagrafica.

Firma e confine in docs/contratti-account.md. Il servizio crea solo la riga
`utenti`, disattivata e con una password provvisoria che non viene comunicata
a nessuno, e ne restituisce l'id. Non assegna ruoli, non crea l'anagrafica, non mette
l'account in attesa di attivazione e non fa commit: tutto questo lo fa il
chiamante nella stessa transazione. L'attivazione arriva dopo la verifica di
email e cellulare (otp/attivazione.py).
"""
import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.auth.models import DISATTIVO
from src.security.password import hash_password
from src.utenti.models import Utente

NOME_MANCANTE = "Nome e cognome servono per creare il nome utente."
# Apostrofi tolti dal nome utente: dritto, tipografici, accenti gravi e acuti isolati.
_APOSTROFI = str.maketrans("", "", "'’‘`´ʼ")


def _parte(valore: str | None) -> str:
    """Senza apostrofi e spazi, con la sola iniziale maiuscola: "De Luca" -> "Deluca"."""
    return "".join((valore or "").translate(_APOSTROFI).split()).capitalize()


def _usato(db: Session, username: str) -> bool:
    # Il confronto lo fa il database, con la stessa regola della ricerca al
    # login (servizio_login.trova_utente_per_username): nella collation della
    # tabella maiuscole, minuscole e accenti non contano.
    return db.scalar(select(Utente.utente_id).where(Utente.utente_username == username).limit(1)) is not None


def genera_username(db: Session, nome: str, cognome: str) -> str:
    """Nome e cognome, ciascuno con la sola iniziale maiuscola, uniti e senza
    spazi ne' apostrofi ("mario", "ROSSI" -> "MarioRossi"; "Anna Maria",
    "D'Amico" -> "AnnamariaDamico"). Se il nome e' gia' usato riceve un numero
    in coda, a partire da 2.

    Il controllo dei doppioni non distingue maiuscole e minuscole: un
    "Mariorossi" gia' presente fa nascere "MarioRossi2", non un secondo nome
    che il login non saprebbe distinguere.
    Limite noto: utente_username non ha un vincolo UNIQUE, quindi due
    creazioni nello stesso istante potrebbero scegliere lo stesso nome.
    """
    base = f"{_parte(nome)}{_parte(cognome)}"
    if not base:
        raise ValueError(NOME_MANCANTE)
    candidato, numero = base, 2
    while _usato(db, candidato):
        candidato = f"{base}{numero}"
        numero += 1
    return candidato


def crea_account(db: Session, *, nome: str, cognome: str, autore_id: int) -> int:
    """Crea l'utente disattivato e ne restituisce l'id.

    - nome utente da genera_username;
    - password provvisoria: un valore casuale di cui si salva solo l'hash e
      che non viene comunicato a nessuno, cosi' il campo non resta vuoto.
      Quella vera viene generata all'attivazione e inviata via email
      (account/attivazione.py);
    - utente padre, creato da e aggiornato da: chi crea (`autore_id`).

    Non fa commit.
    """
    utente = Utente(
        utente_username=genera_username(db, nome, cognome),
        utente_password="",
        utente_password_hash=hash_password(secrets.token_urlsafe(32)),
        utente_password_algo="bcrypt",
        utente_attivoSN=DISATTIVO,
        utente_padre=autore_id,
        utente_created_by=autore_id,
        utente_updated_by=autore_id,
    )
    db.add(utente)
    db.flush()  # genera utente_id
    return utente.utente_id
