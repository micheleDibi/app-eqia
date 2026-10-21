"""Creazione, scritture atomiche e integrazione con il ciclo account V1."""
import re

import pytest
from fastapi import HTTPException
from sqlalchemy import select, func

from gestione_supporto import gestore, crea_persona, dati_persona, ultima_email
from src.clienti.models import Cliente
from src.notifiche.backend_invio import backend_memoria
from src.notifiche.sms import memoria_sms
from src.otp.models import Attivazione
from src.utenti.models import Utente


def test_crea_anagrafica_account_e_attesa_senza_inviare_credenziali(db, gestore):
    browser, autore, _ = gestore()
    inviate = len(backend_memoria().inviate)
    riga = crea_persona(browser)
    assert riga['cliente_id'] != riga['utente_id']
    assert riga['padre_utente_id'] == autore.utente_id
    assert not riga['attivo'] and riga['username']
    assert 'password' not in str(riga).lower()
    db.rollback()
    attesa = db.get(Attivazione, riga['utente_id'])
    assert attesa.cliente_id == riga['cliente_id']
    assert len(backend_memoria().inviate) == inviate


def test_errore_durante_creazione_non_lascia_account_orfano(db, gestore, monkeypatch):
    from src.clienti import servizio
    browser, _, _ = gestore()
    prima = db.scalar(select(func.count()).select_from(Utente))
    originale = servizio.crea_account

    def interrotto(*args, **kwargs):
        originale(*args, **kwargs)
        raise HTTPException(503, 'Operazione interrotta.')

    monkeypatch.setattr(servizio, 'crea_account', interrotto)
    risposta = browser.post('/clienti/?tipo=attuatore', json=dati_persona())
    assert risposta.status_code == 503
    db.rollback()
    assert db.scalar(select(func.count()).select_from(Utente)) == prima
    assert db.scalar(select(func.count()).select_from(Attivazione)) == 0


@pytest.mark.parametrize('campo', ['cliente_codice_fiscale', 'cliente_email', 'cliente_cellulare', 'cliente_documento'])
def test_duplicato_rifiutato_senza_secondo_account(db, gestore, campo):
    browser, _, _ = gestore()
    originale = dati_persona()
    crea_persona(browser, originale)
    duplicato = dati_persona(1) | {campo: originale[campo]}
    risposta = browser.post('/clienti/?tipo=attuatore', json=duplicato)
    assert risposta.status_code == 409
    db.rollback()
    assert db.scalar(select(func.count()).select_from(Utente)) == 2


@pytest.mark.parametrize('valori', [
    {'cliente_codice_fiscale': 'TSTPRS90A01H501A'}, {'cliente_CAP': 'ABCDE'},
    {'cliente_email': 'non-valida'}, {'cliente_cellulare': 'abc'},
    {'cliente_dataNascita': '2099-01-01'}, {'cliente_dataScadenzaDocumento': '2020-01-01'},
    {'utente_id': 1}, {'utente_password': 'non-consentita'}, {'email_verificata': True},
])
def test_payload_non_valido_o_campi_riservati_non_creano_utenti(db, gestore, valori):
    browser, _, _ = gestore()
    risposta = browser.post('/clienti/?tipo=attuatore', json=dati_persona() | valori)
    assert risposta.status_code == 422, risposta.text
    db.rollback()
    assert db.scalar(select(func.count()).select_from(Utente)) == 1


def test_modifica_non_cambia_identificativi_o_username(db, gestore):
    browser, _, _ = gestore()
    riga = crea_persona(browser)
    dati = dati_persona() | {'cliente_nome': 'Nuovo', 'padre_utente_id': riga['padre_utente_id']}
    risposta = browser.put(f"/clienti/{riga['cliente_id']}", json=dati)
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()['cliente_nome'] == 'Nuovo'
    for campo in ('cliente_id', 'utente_id', 'username', 'cliente_codice'):
        assert risposta.json()[campo] == riga[campo]
    db.rollback()
    assert db.scalar(select(func.count()).select_from(Utente)) == 2


def test_creazione_api_collegata_a_verifica_contatti_attivazione_e_login(db, gestore, client):
    browser, _, _ = gestore()
    riga = crea_persona(browser)
    base = f"/clienti/{riga['cliente_id']}/contatti"
    assert browser.get(base).json()['attivazione'] == 'in_attesa'
    for tipo in ('email', 'cellulare'):
        invio = browser.post(f'{base}/{tipo}/genera-otp', json={'valore': riga[f'cliente_{tipo}']})
        assert invio.status_code == 200, invio.text
        testo = ultima_email() if tipo == 'email' else memoria_sms.inviati[-1][1]
        codice = re.search(r'\b\d{6}\b', testo).group()
        esito = browser.post(f'{base}/{tipo}/verifica-otp', json={'sfida': invio.json()['sfida'], 'codice': codice})
        assert esito.status_code == 200, esito.text
    assert esito.json()['attivazione'] == 'attivo'
    assert esito.json()['credenziali_inviate'] is True
    password = re.search(r'Password:\s*(\S+)', ultima_email()).group(1)
    accesso = client.post('/auth/login', json={'utente_username': riga['username'], 'utente_password': password})
    assert accesso.status_code == 200 and accesso.json()['ruolo_codice'] == 'startup'
    db.rollback()
    assert db.get(Attivazione, riga['utente_id']) is None


def test_sottoscrittore_resta_senza_ruolo_e_senza_accesso(db, gestore, client):
    browser, _, _ = gestore(1)
    riga = crea_persona(browser, dati_persona(ruolo=None))
    assert riga['tipo'] == 'sottoscrittore' and riga['cliente_ruolo'] is None
    risposta = browser.put(f"/clienti/{riga['cliente_id']}", json=dati_persona(ruolo=1) |
                           {'padre_utente_id': riga['padre_utente_id']})
    assert risposta.status_code == 422
    assert client.post('/auth/login', json={'utente_username': riga['username'], 'utente_password': 'errata'}).status_code == 401


def test_cambio_ruolo_revoca_sessione_del_destinatario(db, gestore):
    admin, _, _ = gestore()
    browser, utente, cliente = gestore(1)
    risposta = admin.put(f'/clienti/{cliente.cliente_id}', json=dati_persona(ruolo=3))
    assert risposta.status_code == 200, risposta.text
    assert browser.get('/clienti/?tipo=sottoscrittore').status_code == 401
    db.rollback()
    assert db.get(Cliente, cliente.cliente_id).utente_id == utente.utente_id


def test_nazionale_non_puo_declassare_il_proprio_account(gestore):
    browser, _, cliente = gestore()
    risposta = browser.put(f'/clienti/{cliente.cliente_id}', json=dati_persona(ruolo=1))
    assert risposta.status_code == 403
