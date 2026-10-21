"""Dati sintetici e sessioni reali per le prove delle anagrafiche."""
import re
from contextlib import ExitStack

import pytest
from fastapi.testclient import TestClient

from conftest import PASSWORD
from src.main import app
from src.notifiche.backend_invio import backend_memoria

CODICI = ('TSTPRS90A01H501Z', 'TSTPRS90A02H501E', 'TSTPRS90A03H501G',
          'TSTPRS90A04H501I', 'TSTPRS90A05H501M', 'TSTPRS90A06H501O')


def ultima_email():
    return backend_memoria().inviate[-1].get_body(preferencelist=('plain',)).get_content()


def sessione(browser, utente):
    risposta = browser.post('/auth/login', json={
        'utente_username': utente.utente_username, 'utente_password': PASSWORD})
    assert risposta.status_code == 200, risposta.text
    if risposta.json().get('requires_2fa'):
        codice = re.search(r'\b\d{6}\b', ultima_email()).group()
        risposta = browser.post('/auth/verifica-otp', json={
            'sfida': risposta.json()['sfida'], 'codice': codice})
        assert risposta.status_code == 200, risposta.text
    browser.headers['X-CSRF-Token'] = risposta.json()['csrf_token']


@pytest.fixture
def gestore(account):
    with ExitStack() as pila:
        def entra(ruolo=5):
            utente, cliente = account(ruolo)
            browser = pila.enter_context(TestClient(app, base_url='http://localhost:5180',
                headers={'X-EQIA-Request': '1', 'Origin': 'http://localhost:5180'}))
            sessione(browser, utente)
            return browser, utente, cliente
        yield entra


def dati_persona(numero=0, ruolo=1):
    return {
        'cliente_nome': 'Persona', 'cliente_cognome': f'Prova{numero}',
        'cliente_codice_fiscale': CODICI[numero], 'cliente_dataNascita': f'1990-01-{numero + 1:02}',
        'cliente_luogoNascita': 'Roma', 'cliente_cittadinanza': 'Italiana',
        'cliente_documento': f'DOC-TEST-{numero}', 'cliente_comuneRilascio': 'Roma',
        'cliente_dataRilascio': '2025-01-01', 'cliente_dataScadenzaDocumento': '2035-01-01',
        'cliente_indirizzo': 'Via delle Prove', 'cliente_citta': 'Roma',
        'cliente_CAP': '00100', 'cliente_provincia': 'RM',
        'cliente_email': f'anagrafica{numero}@example.org', 'cliente_cellulare': f'+3933300100{numero:02}',
        'cliente_ruolo': ruolo,
    }


def dati_centro(numero=0):
    return {
        'azienda_ragione_sociale': f'Centro di prova {numero}', 'azienda_partitaIVA': f'{numero + 1:011}',
        'azienda_codiceFiscale': f'{numero + 1:011}', 'azienda_via': 'Via delle Prove',
        'azienda_citta': 'Roma', 'azienda_CAP': '00100', 'azienda_provincia': 'RM',
    }


def crea_persona(browser, dati=None):
    dati = dati if dati is not None else dati_persona()
    tipo = 'attuatore' if dati.get('cliente_ruolo') else 'sottoscrittore'
    risposta = browser.post(f'/clienti/?tipo={tipo}', json=dati)
    assert risposta.status_code == 201, risposta.text
    return risposta.json()


def crea_centro(browser, dati=None):
    risposta = browser.post('/aziende/', json=dati if dati is not None else dati_centro())
    assert risposta.status_code == 201, risposta.text
    return risposta.json()
