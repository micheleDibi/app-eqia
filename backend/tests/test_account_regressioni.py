"""Revoca persistente e unicità degli account su MariaDB locale."""
import pytest
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.account.creazione import crea_account
from src.database import SessionLocal
from src.utenti.models import Utente
from test_account import accedi, nazionale, stato  # noqa: F401


def test_riattivazione_non_ripristina_la_vecchia_sessione(accedi, nazionale):
    _, amministratore = nazionale
    persona, browser = accedi(1)
    cliente_id = persona.clienti.cliente_id
    assert browser.get("/auth/session").status_code == 200
    assert stato(amministratore, cliente_id, False).status_code == 200
    assert stato(amministratore, cliente_id, True).status_code == 200
    assert browser.get("/auth/session").status_code == 401


def test_database_impedisce_username_equivalenti(db, account):
    persona, _ = account()
    db.add(Utente(utente_username=persona.utente_username.upper(),
                  utente_password="", utente_password_algo="bcrypt"))
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


def test_nome_utente_lungo_e_omonimo_rispettano_il_limite(db, account):
    autore, _ = account(5)
    primo = crea_account(db, nome="A" * 150, cognome="B" * 150, autore_id=autore.utente_id)
    secondo = crea_account(db, nome="A" * 150, cognome="B" * 150, autore_id=autore.utente_id)
    nomi = list(db.scalars(select(Utente.utente_username).where(Utente.utente_id.in_([primo, secondo]))))
    assert len(set(nomi)) == 2
    assert all(len(nome) <= 255 for nome in nomi)


def test_due_creazioni_contemporanee_non_duplicano_username(db, account, monkeypatch):
    from src.account import creazione
    autore, _ = account(5)
    autore_id = autore.utente_id
    barriera = Barrier(2, timeout=10)
    verifica = creazione._usato

    def contemporanea(sessione, candidato):
        usato = verifica(sessione, candidato)
        if candidato == "MarioRossi":
            barriera.wait()
        return usato

    def crea():
        with SessionLocal() as sessione:
            utente_id = crea_account(sessione, nome="Mario", cognome="Rossi", autore_id=autore_id)
            sessione.commit()
            return sessione.get(Utente, utente_id).utente_username

    monkeypatch.setattr(creazione, "_usato", contemporanea)
    with ThreadPoolExecutor(max_workers=2) as esecutore:
        risultati = [esecutore.submit(crea) for _ in range(2)]
        assert {risultato.result(timeout=15) for risultato in risultati} == {"MarioRossi", "MarioRossi2"}
