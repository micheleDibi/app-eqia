"""Creazione interna dell'account (src/account/creazione.py) e ciclo V1
completo: creazione, verifica di email e cellulare, attivazione e consegna
delle credenziali. La parte dell'anagrafica la simula il test, come la fara'
la creazione delle anagrafiche (docs/contratti-account.md)."""
import re
from contextlib import ExitStack

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from src.account.creazione import NOME_MANCANTE, crea_account, genera_username
from src.clienti.models import Cliente
from src.main import app
from src.notifiche.backend_invio import backend_memoria
from src.notifiche.sms import memoria_sms
from src.otp.models import Attivazione
from src.security.password import verify_password
from src.utenti.models import Utente
from conftest import PASSWORD

STARTUP, NAZIONALE = 1, 5


def username_presente(db, username):
    """Un utente con quel nome esatto, gia' salvato."""
    db.add(Utente(utente_username=username, utente_password="", utente_password_algo="bcrypt"))
    db.commit()


def ultimo_testo_email():
    return backend_memoria().inviate[-1].get_body(preferencelist=("plain",)).get_content()


@pytest.fixture
def accedi(client, account):
    """Una persona con la sua sessione, in un browser proprio: (utente, browser)."""
    with ExitStack() as pila:
        def entra(ruolo):
            utente, _ = account(ruolo)
            browser = pila.enter_context(TestClient(
                app, base_url="http://localhost:5180",
                headers={"X-EQIA-Request": "1", "Origin": "http://localhost:5180"}))
            risposta = browser.post("/auth/login", json={"utente_username": utente.utente_username,
                                                         "utente_password": PASSWORD})
            assert risposta.status_code == 200, risposta.text
            if risposta.json().get("requires_2fa"):
                codice = re.search(r"\b\d{6}\b", ultimo_testo_email()).group()
                risposta = browser.post("/auth/verifica-otp", json={"sfida": risposta.json()["sfida"], "codice": codice})
                assert risposta.status_code == 200, risposta.text
            browser.headers["X-CSRF-Token"] = risposta.json()["csrf_token"]
            return utente, browser
        yield entra


@pytest.fixture
def nazionale(accedi):
    return accedi(NAZIONALE)


def nuova_anagrafica(db, autore_id, *, cliente_id=5000, email="mario.rossi@example.org", cellulare=None,
                     ruolo=STARTUP):
    """Quello che fara' la creazione dell'anagrafica, nella stessa transazione:
    account, anagrafica collegata e attesa di attivazione."""
    utente_id = crea_account(db, nome="Mario", cognome="Rossi", autore_id=autore_id)
    db.add(Cliente(cliente_id=cliente_id, utente_id=utente_id, cliente_nome="Mario", cliente_cognome="Rossi",
                   cliente_email=email, cliente_cellulare=cellulare, cliente_ruolo=ruolo))
    db.flush()
    db.add(Attivazione(utente_id=utente_id, cliente_id=cliente_id))
    db.commit()
    return utente_id


# =============================================================================
# Il servizio
# =============================================================================
def test_crea_l_utente_disattivato_con_padre_e_senza_anagrafica(db, account):
    autore, _ = account(NAZIONALE)
    utente_id = crea_account(db, nome="Mario", cognome="Rossi", autore_id=autore.utente_id)
    db.commit()

    utente = db.get(Utente, utente_id)
    assert utente.utente_username == "MarioRossi"
    assert utente.utente_attivoSN == 0
    assert utente.utente_padre == utente.utente_created_by == utente.utente_updated_by == autore.utente_id
    assert utente.utente_password == "" and utente.utente_password_algo == "bcrypt"
    # Nessuno conosce la password: un hash vero, che non corrisponde a niente di ovvio.
    assert utente.utente_password_hash.startswith("$2")
    assert not verify_password("", utente.utente_password_hash)
    # Ruolo e anagrafica restano al chiamante.
    assert db.scalar(text("SELECT COUNT(*) FROM clienti WHERE utente_id = :u"), {"u": utente_id}) == 0


def test_non_fa_commit(db, account):
    autore, _ = account(NAZIONALE)
    prima = db.scalar(text("SELECT COUNT(*) FROM utenti"))
    crea_account(db, nome="Mario", cognome="Rossi", autore_id=autore.utente_id)
    db.rollback()
    assert db.scalar(text("SELECT COUNT(*) FROM utenti")) == prima


def test_un_utente_disattivato_non_entra(db, client, account):
    autore, _ = account(NAZIONALE)
    utente_id = crea_account(db, nome="Mario", cognome="Rossi", autore_id=autore.utente_id)
    db.add(Cliente(cliente_id=5000, utente_id=utente_id, cliente_nome="Mario", cliente_cognome="Rossi",
                   cliente_email="mario.rossi@example.org", cliente_ruolo=STARTUP))
    db.commit()
    risposta = client.post("/auth/login", json={"utente_username": "MarioRossi", "utente_password": PASSWORD})
    assert risposta.status_code == 401


@pytest.mark.parametrize("nome, cognome, atteso", [
    ("Mario", "Rossi", "MarioRossi"),
    ("  mario ", "ROSSI", "MarioRossi"),
    # Solo la prima lettera di nome e cognome resta maiuscola; spazi e
    # apostrofi, anche quelli tipografici, si tolgono.
    ("Anna Maria", "De Luca", "AnnamariaDeluca"),
    ("Anna  Maria\t", " Di  Pietro ", "AnnamariaDipietro"),
    ("Niccolò", "D'Amico", "NiccolòDamico"),
    ("Gianni", "Dell’Orto", "GianniDellorto"),
    ("'", "Rossi", "Rossi"),
])
def test_come_si_forma_il_nome_utente(db, nome, cognome, atteso):
    assert genera_username(db, nome, cognome) == atteso


def test_se_il_nome_e_usato_riceve_un_numero_in_coda(db):
    username_presente(db, "MarioRossi")
    assert genera_username(db, "Mario", "Rossi") == "MarioRossi2"
    username_presente(db, "MarioRossi2")
    assert genera_username(db, "Mario", "Rossi") == "MarioRossi3"


@pytest.mark.parametrize("esistente", ["mariorossi", "MARIOROSSI", "MarìoRossi"])
def test_maiuscole_minuscole_e_accenti_contano_come_il_login(db, esistente):
    """Il login non distingue questi nomi: il servizio non li fa nascere doppi."""
    username_presente(db, esistente)
    assert genera_username(db, "Mario", "Rossi") == "MarioRossi2"


@pytest.mark.parametrize("nome, cognome", [("", ""), ("  ", " "), (None, None), ("'", "’")])
def test_senza_nome_e_cognome_si_ferma(db, nome, cognome):
    with pytest.raises(ValueError, match=NOME_MANCANTE):
        genera_username(db, nome, cognome)


# =============================================================================
# Il ciclo V1 completo
# =============================================================================
def test_creazione_verifica_dei_contatti_attivazione_e_credenziali(db, client, nazionale):
    autore, browser = nazionale
    email, cellulare = "mario.rossi@example.org", "+393331234567"
    utente_id = nuova_anagrafica(db, autore.utente_id, email=email, cellulare=cellulare)

    stato = browser.get("/clienti/5000/contatti").json()
    assert stato["attivazione"] == "in_attesa"
    assert not stato["email"]["verificato"] and not stato["cellulare"]["verificato"]

    # Email: il codice arriva alla persona, l'operatore lo inserisce.
    invio = browser.post("/clienti/5000/contatti/email/genera-otp", json={"valore": email})
    assert invio.status_code == 200, invio.text
    codice = re.search(r"\b\d{6}\b", ultimo_testo_email()).group()
    esito = browser.post("/clienti/5000/contatti/email/verifica-otp",
                         json={"sfida": invio.json()["sfida"], "codice": codice})
    assert esito.status_code == 200, esito.text
    assert esito.json()["message"] == "Contatto verificato."
    db.commit()
    assert db.get(Utente, utente_id).utente_attivoSN == 0

    # Cellulare: verificato il secondo contatto, l'account si attiva.
    invio = browser.post("/clienti/5000/contatti/cellulare/genera-otp", json={"valore": cellulare})
    assert invio.status_code == 200, invio.text
    destinatario, sms = memoria_sms.inviati[-1]
    assert destinatario == cellulare
    codice = re.search(r"\b\d{6}\b", sms).group()
    esito = browser.post("/clienti/5000/contatti/cellulare/verifica-otp",
                         json={"sfida": invio.json()["sfida"], "codice": codice})
    assert esito.status_code == 200, esito.text
    assert esito.json()["credenziali_inviate"] is True
    assert esito.json()["attivazione"] == "attivo"

    db.commit()
    assert db.get(Utente, utente_id).utente_attivoSN == -1
    assert db.get(Attivazione, utente_id) is None

    # Le credenziali arrivano all'email dell'anagrafica e funzionano.
    credenziali = backend_memoria().inviate[-1]
    assert credenziali["To"] == email
    testo = ultimo_testo_email()
    assert re.search(r"Username:\s*MarioRossi\b", testo)
    password = re.search(r"Password:\s*(\S+)", testo).group(1)
    accesso = client.post("/auth/login", json={"utente_username": "MarioRossi", "utente_password": password})
    assert accesso.status_code == 200, accesso.text
    assert accesso.json()["ruolo_codice"] == "startup"


def test_un_codice_sbagliato_non_attiva(db, nazionale):
    autore, browser = nazionale
    utente_id = nuova_anagrafica(db, autore.utente_id)

    invio = browser.post("/clienti/5000/contatti/email/genera-otp", json={"valore": "mario.rossi@example.org"})
    codice = re.search(r"\b\d{6}\b", ultimo_testo_email()).group()
    sbagliato = "000000" if codice != "000000" else "111111"
    esito = browser.post("/clienti/5000/contatti/email/verifica-otp",
                         json={"sfida": invio.json()["sfida"], "codice": sbagliato})
    assert esito.status_code == 400, esito.text
    db.commit()
    assert db.get(Utente, utente_id).utente_attivoSN == 0


# =============================================================================
# Stato dell'account (solo Nazionale)
# =============================================================================
def stato(browser, cliente_id, attivo):
    return browser.put(f"/clienti/{cliente_id}/account/stato", json={"attivo": attivo})


@pytest.mark.parametrize("ruolo", [2, STARTUP, 3])
def test_solo_il_nazionale_cambia_lo_stato(db, account, accedi, ruolo):
    persona, anagrafica = account(STARTUP)
    _, browser = accedi(ruolo)
    risposta = stato(browser, anagrafica.cliente_id, False)
    assert risposta.status_code == 403
    assert risposta.json()["detail"] == "Solo il Nazionale può eseguire questa operazione."
    db.commit()
    assert db.get(Utente, persona.utente_id).utente_attivoSN == -1


def test_anagrafica_inesistente(nazionale):
    _, browser = nazionale
    risposta = stato(browser, 99999, False)
    assert risposta.status_code == 404
    assert risposta.json()["detail"] == "Anagrafica non trovata."


def test_disattivato_non_entra_e_la_sessione_aperta_si_chiude(db, account, accedi, nazionale):
    autore, browser = nazionale
    persona, sessione = accedi(STARTUP)
    anagrafica = db.scalar(text("SELECT cliente_id FROM clienti WHERE utente_id = :u"), {"u": persona.utente_id})
    assert sessione.get("/auth/session").status_code == 200

    risposta = stato(browser, anagrafica, False)
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()["attivazione"] == "disattivato"
    assert sessione.get("/auth/session").status_code == 401
    db.commit()
    assert db.get(Utente, persona.utente_id).utente_updated_by == autore.utente_id

    # Riattivato, rientra con la sua password.
    assert stato(browser, anagrafica, True).json()["attivazione"] == "attivo"
    nuovo = TestClient(app, base_url="http://localhost:5180",
                       headers={"X-EQIA-Request": "1", "Origin": "http://localhost:5180"})
    assert nuovo.post("/auth/login", json={"utente_username": persona.utente_username,
                                           "utente_password": PASSWORD}).status_code == 200


def test_attivare_a_mano_chiude_l_attesa_e_non_spedisce_credenziali(db, nazionale):
    autore, browser = nazionale
    utente_id = nuova_anagrafica(db, autore.utente_id)
    inviate = len(backend_memoria().inviate)

    risposta = stato(browser, 5000, True)
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()["attivazione"] == "attivo"
    assert len(backend_memoria().inviate) == inviate
    db.commit()
    assert db.get(Utente, utente_id).utente_attivoSN == -1
    assert db.get(Attivazione, utente_id) is None


def test_lo_stesso_stato_non_annulla_l_attesa(db, nazionale):
    autore, browser = nazionale
    utente_id = nuova_anagrafica(db, autore.utente_id)
    assert stato(browser, 5000, False).json()["attivazione"] == "in_attesa"
    db.commit()
    assert db.get(Attivazione, utente_id) is not None


def test_dopo_un_cambio_di_stato_la_verifica_non_attiva_piu(db, nazionale):
    """Disattivato a mano mentre era in attesa: verificare i contatti non lo
    riattiva e non spedisce credenziali."""
    autore, browser = nazionale
    utente_id = nuova_anagrafica(db, autore.utente_id)
    assert stato(browser, 5000, True).status_code == 200
    assert stato(browser, 5000, False).json()["attivazione"] == "disattivato"

    invio = browser.post("/clienti/5000/contatti/email/genera-otp", json={"valore": "mario.rossi@example.org"})
    codice = re.search(r"\b\d{6}\b", ultimo_testo_email()).group()
    esito = browser.post("/clienti/5000/contatti/email/verifica-otp",
                         json={"sfida": invio.json()["sfida"], "codice": codice})
    assert esito.status_code == 200, esito.text
    assert esito.json()["credenziali_inviate"] is None
    db.commit()
    assert db.get(Utente, utente_id).utente_attivoSN == 0
