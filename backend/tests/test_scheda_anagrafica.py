"""Scheda di sottoscrittori e attuatori (src/clienti/scheda.py): lettura,
salvataggio dei dati della persona, ruolo e visibilita'."""
import re
from contextlib import ExitStack
from datetime import date

import pytest
from fastapi.testclient import TestClient

from src.aziende.models import Azienda
from src.main import app
from src.notifiche.backend_invio import backend_memoria
from src.otp.models import Attivazione
from conftest import PASSWORD

STARTUP, BUSINESS, EDUCATION, NAZIONALE = 1, 2, 3, 5
CF_VALIDO = "RSSMRA85T10A562S"


@pytest.fixture
def entra(account):
    """Una persona con la sua sessione, in un browser proprio:
    (utente, persona, browser)."""
    with ExitStack() as pila:
        def apri(ruolo):
            utente, persona = account(ruolo)
            browser = pila.enter_context(TestClient(
                app, base_url="http://localhost:5180",
                headers={"X-EQIA-Request": "1", "Origin": "http://localhost:5180"}))
            risposta = browser.post("/auth/login", json={"utente_username": utente.utente_username,
                                                         "utente_password": PASSWORD})
            assert risposta.status_code == 200, risposta.text
            if risposta.json().get("requires_2fa"):
                testo = backend_memoria().inviate[-1].get_body(preferencelist=("plain",)).get_content()
                risposta = browser.post("/auth/verifica-otp", json={
                    "sfida": risposta.json()["sfida"], "codice": re.search(r"\b\d{6}\b", testo).group()})
                assert risposta.status_code == 200, risposta.text
            browser.headers["X-CSRF-Token"] = risposta.json()["csrf_token"]
            return utente, persona, browser
        yield apri


def figlio_di(db, account, padre, ruolo):
    utente, persona = account(ruolo)
    utente.utente_padre = padre.utente_id
    db.commit()
    return utente, persona


def test_il_nazionale_legge_la_scheda_di_un_attuatore_con_centro_padre_e_permessi(db, account, entra):
    nazionale, _, browser = entra(NAZIONALE)
    centro = Azienda(azienda_ragione_sociale="Centro Nord", azienda_partitaIVA="01234567890",
                     azienda_via="Via Roma", azienda_citta="Milano", azienda_CAP="20100",
                     azienda_provincia="MI", azienda_email="centro@example.org")
    db.add(centro)
    db.flush()
    utente, persona = figlio_di(db, account, nazionale, BUSINESS)
    persona.azienda_id = centro.azienda_id
    db.commit()

    risposta = browser.get(f"/clienti/{persona.cliente_id}")
    assert risposta.status_code == 200, risposta.text
    scheda = risposta.json()
    assert scheda["tipo"] == "attuatore"
    assert scheda["cliente_nome"] == "Anna" and scheda["cliente_ruolo"] == BUSINESS
    assert scheda["account"]["username"] == utente.utente_username
    assert scheda["account"]["attivazione"] == "attivo"
    assert scheda["account"]["padre"] == {"utente_id": nazionale.utente_id, "nome": "Anna Rossi"}
    assert scheda["centro"]["ragione_sociale"] == "Centro Nord"
    assert scheda["centro"]["partita_iva"] == "01234567890"
    assert scheda["centro_nascosto"] is False
    assert scheda["permessi"] == {"ruoli": [None, NAZIONALE, BUSINESS, STARTUP, EDUCATION],
                                  "stato_account": True, "accedi": True, "username": True, "padre": True,
                                  "centro": True}


def test_un_sottoscrittore_si_promuove_e_un_attuatore_torna_sottoscrittore(db, account, entra):
    nazionale, _, browser = entra(NAZIONALE)
    _, persona = figlio_di(db, account, nazionale, None)

    scheda = browser.get(f"/clienti/{persona.cliente_id}").json()
    assert scheda["tipo"] == "sottoscrittore"
    assert scheda["cliente_ruolo"] is None and scheda["centro"] is None
    assert scheda["permessi"]["ruoli"] == [None, NAZIONALE, BUSINESS, STARTUP, EDUCATION]
    assert scheda["permessi"]["accedi"] is False

    promosso = browser.put(f"/clienti/{persona.cliente_id}", json={"cliente_ruolo": STARTUP})
    assert promosso.status_code == 200, promosso.text
    assert promosso.json()["tipo"] == "attuatore" and promosso.json()["cliente_ruolo"] == STARTUP
    riportato = browser.put(f"/clienti/{persona.cliente_id}", json={"cliente_ruolo": None})
    assert riportato.status_code == 200, riportato.text
    assert riportato.json()["tipo"] == "sottoscrittore"


def test_fuori_dalla_rete_la_scheda_non_esiste(db, account, entra):
    business, _, browser = entra(BUSINESS)
    _, estranea = account(STARTUP)
    _, figlia = figlio_di(db, account, business, STARTUP)

    assert browser.get(f"/clienti/{figlia.cliente_id}").status_code == 200
    for percorso in (f"/clienti/{estranea.cliente_id}", "/clienti/999999"):
        assert browser.get(percorso).json() == {"detail": "Anagrafica non trovata."}
        risposta = browser.put(percorso, json={"cliente_nome": "Altro"})
        assert risposta.status_code == 404
    db.refresh(estranea)
    assert estranea.cliente_nome == "Anna"


def test_salva_solo_i_campi_inviati_ripuliti(db, account, entra):
    nazionale, _, browser = entra(NAZIONALE)
    _, persona = figlio_di(db, account, nazionale, None)

    risposta = browser.put(f"/clienti/{persona.cliente_id}", json={
        "cliente_nome": "  Maria ", "cliente_codice_fiscale": CF_VALIDO.lower(),
        "cliente_dataNascita": "1985-12-10", "cliente_sesso": "donna",
        "cliente_pec": "", "cliente_cittaDomicilio": "  ", "cliente_civico": None,
    })
    assert risposta.status_code == 200, risposta.text
    scheda = risposta.json()
    assert scheda["cliente_nome"] == "Maria" and scheda["cliente_cognome"] == "Rossi"
    assert scheda["cliente_codice_fiscale"] == CF_VALIDO
    assert scheda["cliente_dataNascita"] == "1985-12-10" and scheda["cliente_sesso"] == "donna"
    db.refresh(persona)
    assert persona.cliente_pec is None and persona.cliente_cittaDomicilio is None
    assert persona.cliente_civico == ""


@pytest.mark.parametrize("campo,valore,messaggio", [
    ("cliente_nome", "  ", "Il nome è obbligatorio."),
    ("cliente_codice_fiscale", "RSSMRA85T10A562X", "Codice fiscale non valido: carattere di controllo errato."),
    ("cliente_email", "senza-chiocciola", "Email non valida: formato non conforme."),
    ("cliente_pec", "pec@dominio", "PEC non valida: formato non conforme."),
    ("cliente_dataScadenzaDocumento", "2001-01-01",
     "Il documento è scaduto: inserisci una data di scadenza valida."),
    ("cliente_dataNascita", None, "La data di nascita è obbligatoria."),
    ("cliente_tipoDocumento", "Tessera della palestra", "Tipo di documento non valido."),
])
def test_rifiuta_un_valore_nuovo_non_valido(db, account, entra, campo, valore, messaggio):
    nazionale, _, browser = entra(NAZIONALE)
    _, persona = figlio_di(db, account, nazionale, None)

    risposta = browser.put(f"/clienti/{persona.cliente_id}", json={"cliente_cognome": "Bianchi", campo: valore})
    assert risposta.status_code == 422
    assert risposta.json()["detail"] == messaggio
    db.refresh(persona)
    assert persona.cliente_cognome == "Rossi"


def test_un_dato_salvato_e_non_toccato_non_blocca_il_resto(db, account, entra):
    nazionale, _, browser = entra(NAZIONALE)
    _, persona = figlio_di(db, account, nazionale, None)
    persona.cliente_codice_fiscale = "CODICE-STORICO"
    persona.cliente_dataScadenzaDocumento = date(2001, 1, 1)
    db.commit()

    risposta = browser.put(f"/clienti/{persona.cliente_id}", json={
        "cliente_codice_fiscale": "CODICE-STORICO", "cliente_dataScadenzaDocumento": "2001-01-01",
        "cliente_cittadinanza": "Italiana",
    })
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()["cliente_cittadinanza"] == "Italiana"


@pytest.mark.parametrize("colonna,valore,messaggio", [
    ("cliente_codice_fiscale", CF_VALIDO, "Esiste già un'anagrafica con questo codice fiscale."),
    ("cliente_email", "doppia@example.org", "Esiste già un'anagrafica registrata con questa email."),
    ("cliente_telefono", "02 7654321", "Esiste già un'anagrafica con questo numero di telefono."),
    ("cliente_cellulare", "+393331112223", "Esiste già un'anagrafica con questo numero di cellulare."),
    ("cliente_pec", "doppia@pec.example.org", "Esiste già un'anagrafica con questa PEC."),
    ("cliente_documento", "CA12345BB", "Esiste già un'anagrafica con questo numero di documento."),
])
def test_rifiuta_un_valore_gia_usato_da_un_altra_anagrafica(db, account, entra, colonna, valore, messaggio):
    business, _, browser = entra(BUSINESS)
    _, persona = figlio_di(db, account, business, None)
    # Conta anche un'anagrafica che chi salva non vede.
    _, altra = account(STARTUP)
    setattr(altra, colonna, valore)
    db.commit()

    risposta = browser.put(f"/clienti/{persona.cliente_id}", json={"cliente_cognome": "Bianchi", colonna: valore})
    assert risposta.status_code == 409
    assert risposta.json()["detail"] == messaggio
    db.refresh(persona)
    assert persona.cliente_cognome == "Rossi"


def test_un_doppione_gia_salvato_e_non_toccato_non_blocca_il_resto(db, account, entra):
    nazionale, _, browser = entra(NAZIONALE)
    _, persona = figlio_di(db, account, nazionale, None)
    _, altra = account(STARTUP)
    for riga in (persona, altra):
        riga.cliente_email, riga.cliente_documento = "doppia@example.org", "CA12345BB"
    persona.cliente_codice_fiscale = CF_VALIDO
    db.commit()

    # Rimandati uguali (il codice fiscale anche in minuscolo): niente confronto
    # con l'altra anagrafica, e nessun conflitto con se stessa.
    risposta = browser.put(f"/clienti/{persona.cliente_id}", json={
        "cliente_email": "doppia@example.org", "cliente_documento": "CA12345BB",
        "cliente_codice_fiscale": CF_VALIDO.lower(), "cliente_cittadinanza": "Italiana",
    })
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()["cliente_cittadinanza"] == "Italiana"


def test_i_valori_vuoti_non_sono_doppioni(db, account, entra):
    nazionale, _, browser = entra(NAZIONALE)
    _, persona = figlio_di(db, account, nazionale, None)
    persona.cliente_pec, persona.cliente_telefono = "mia@pec.example.org", "02 1"
    db.commit()
    account(STARTUP)  # PEC NULL e telefono vuoto, come quelli che si salvano

    risposta = browser.put(f"/clienti/{persona.cliente_id}", json={"cliente_pec": "", "cliente_telefono": ""})
    assert risposta.status_code == 200, risposta.text


def test_campi_estranei_alla_scheda_rifiutati(db, account, entra):
    nazionale, _, browser = entra(NAZIONALE)
    _, persona = figlio_di(db, account, nazionale, STARTUP)

    for corpo in ({"utente_id": nazionale.utente_id}, {"azienda_id": 1}, {"cliente_CAP": "1" * 11}):
        assert browser.put(f"/clienti/{persona.cliente_id}", json=corpo).status_code == 422


def test_business_sceglie_solo_fra_i_ruoli_che_assegna(db, account, entra):
    # Business vale Regionale e Provinciale del gestionale di origine:
    # assegna i due Startup (Aderente), promuove e riporta a sottoscrittore.
    business, _, browser = entra(BUSINESS)
    _, figlia = figlio_di(db, account, business, STARTUP)
    _, collega = figlio_di(db, account, business, BUSINESS)
    _, sottoscrittore = figlio_di(db, account, business, None)

    assert browser.get(f"/clienti/{figlia.cliente_id}").json()["permessi"]["ruoli"] == [None, STARTUP, EDUCATION]
    assert browser.put(f"/clienti/{figlia.cliente_id}", json={"cliente_ruolo": NAZIONALE}).status_code == 403
    risposta = browser.put(f"/clienti/{figlia.cliente_id}", json={"cliente_ruolo": EDUCATION})
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()["cliente_ruolo"] == EDUCATION
    assert browser.put(f"/clienti/{figlia.cliente_id}", json={"cliente_ruolo": None}).json()["tipo"] == "sottoscrittore"
    assert browser.put(f"/clienti/{sottoscrittore.cliente_id}", json={"cliente_ruolo": BUSINESS}).status_code == 403
    assert browser.put(f"/clienti/{sottoscrittore.cliente_id}", json={"cliente_ruolo": STARTUP}).status_code == 200

    # Un ruolo che Business non assegna resta bloccato, anche rimandato uguale.
    assert browser.get(f"/clienti/{collega.cliente_id}").json()["permessi"]["ruoli"] == []
    assert browser.put(f"/clienti/{collega.cliente_id}", json={"cliente_ruolo": BUSINESS}).status_code == 200
    for ruolo in (STARTUP, None):
        assert browser.put(f"/clienti/{collega.cliente_id}", json={"cliente_ruolo": ruolo}).status_code == 403


def test_nessuno_cambia_il_proprio_ruolo(db, account, entra):
    _, persona_business, browser_business = entra(BUSINESS)
    assert browser_business.get(f"/clienti/{persona_business.cliente_id}").json()["permessi"]["ruoli"] == []
    assert browser_business.put(f"/clienti/{persona_business.cliente_id}",
                                json={"cliente_ruolo": STARTUP}).status_code == 403
    db.refresh(persona_business)
    assert persona_business.cliente_ruolo == BUSINESS

    _, persona_nazionale, browser = entra(NAZIONALE)
    propria = browser.get(f"/clienti/{persona_nazionale.cliente_id}").json()["permessi"]
    assert propria["ruoli"] == []
    assert browser.put(f"/clienti/{persona_nazionale.cliente_id}", json={"cliente_ruolo": STARTUP}).status_code == 403
    # Su se stesso non c'e' "Accedi con questo utente".
    assert propria["accedi"] is False


def test_startup_salva_l_anagrafica_della_sua_rete_ma_non_i_ruoli(db, account, entra):
    startup, _, browser = entra(STARTUP)
    _, sottoscrittore = figlio_di(db, account, startup, None)
    _, attuatore = figlio_di(db, account, startup, EDUCATION)

    scheda = browser.get(f"/clienti/{attuatore.cliente_id}").json()
    assert scheda["permessi"] == {"ruoli": [], "stato_account": False, "accedi": False,
                                  "username": False, "padre": False, "centro": False}
    assert browser.put(f"/clienti/{attuatore.cliente_id}", json={"cliente_ruolo": STARTUP}).status_code == 403
    risposta = browser.put(f"/clienti/{sottoscrittore.cliente_id}", json={"cliente_telefono": "02 1234567"})
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()["cliente_telefono"] == "02 1234567"


def test_accedi_come_attuatore_solo_per_il_nazionale(db, account, entra):
    business, _, browser = entra(BUSINESS)
    _, figlia = figlio_di(db, account, business, STARTUP)
    assert browser.get(f"/clienti/{figlia.cliente_id}").json()["permessi"]["accedi"] is False


def test_accesso_come_attuatore_solo_su_account_attivi_non_nazionali(db, account, entra):
    nazionale, _, browser = entra(NAZIONALE)
    _, disattivo = figlio_di(db, account, nazionale, STARTUP)
    disattivo.utente.utente_attivoSN = 0
    in_attesa, da_attivare = figlio_di(db, account, nazionale, STARTUP)
    in_attesa.utente_attivoSN = 0
    db.add(Attivazione(utente_id=in_attesa.utente_id, cliente_id=da_attivare.cliente_id))
    _, altro_nazionale = figlio_di(db, account, nazionale, NAZIONALE)
    db.commit()

    for persona, attivazione in ((disattivo, "disattivato"), (da_attivare, "in_attesa"), (altro_nazionale, "attivo")):
        scheda = browser.get(f"/clienti/{persona.cliente_id}").json()
        assert scheda["account"]["attivazione"] == attivazione
        assert scheda["permessi"]["accedi"] is False
