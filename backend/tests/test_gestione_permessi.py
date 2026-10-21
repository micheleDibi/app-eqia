"""Visibilita della rete, separazione dei ruoli e paginazione delle anagrafiche."""
import pytest

from gestione_supporto import gestore, crea_persona, crea_centro, dati_persona
from src.clienti.models import Cliente


@pytest.mark.parametrize('ruolo,consentiti', [(5, {1, 2, 3, 5}), (2, {1, 3}), (1, set()), (3, set())])
def test_catalogo_ruoli_applicato_alle_creazioni(gestore, ruolo, consentiti):
    browser, _, _ = gestore(ruolo)
    for numero, assegnato in enumerate((1, 2, 3, 5)):
        risposta = browser.post('/clienti/?tipo=attuatore', json=dati_persona(numero, assegnato))
        assert risposta.status_code == (201 if assegnato in consentiti else 403), risposta.text
    risposta = browser.get('/clienti/?tipo=attuatore')
    assert risposta.status_code == (200 if consentiti else 403)


@pytest.mark.parametrize('ruolo', [1, 2, 3, 5])
def test_tutti_i_ruoli_creano_sottoscrittori_nella_propria_rete(gestore, ruolo):
    browser, autore, _ = gestore(ruolo)
    riga = crea_persona(browser, dati_persona(ruolo=None))
    assert riga['padre_utente_id'] == autore.utente_id
    assert browser.get('/clienti/?tipo=sottoscrittore').json()['totale'] == 1


def test_business_non_vede_ne_modifica_anagrafiche_di_altra_rete(gestore):
    admin, _, _ = gestore()
    business, _, _ = gestore(2)
    estraneo = crea_persona(admin)
    visibile = crea_persona(business, dati_persona(1))
    elenco = business.get('/clienti/?tipo=attuatore').json()
    assert visibile['cliente_id'] in {p['cliente_id'] for p in elenco['elementi']}
    assert estraneo['cliente_id'] not in {p['cliente_id'] for p in elenco['elementi']}
    assert business.get(f"/clienti/{estraneo['cliente_id']}").status_code == 404
    assert business.put(f"/clienti/{estraneo['cliente_id']}", json=dati_persona()).status_code == 404
    risposta = business.post('/clienti/?tipo=sottoscrittore', json=dati_persona(2, None) |
                              {'attuatore_id': estraneo['cliente_id']})
    assert risposta.status_code == 404


def test_business_non_escalation_ne_trasferimento_della_rete(gestore):
    browser, _, _ = gestore(2)
    riga = crea_persona(browser)
    for ruolo in (2, 5):
        assert browser.put(f"/clienti/{riga['cliente_id']}", json={'cliente_ruolo': ruolo}).status_code == 403
    assert browser.put(f"/clienti/{riga['cliente_id']}", json={'utente_padre': None}).status_code == 403


def test_startup_legge_discendente_ma_non_gestisce_ruoli_o_account(db, gestore, account):
    browser, autore, _ = gestore(1)
    utente, cliente = account(1)
    utente.utente_padre = autore.utente_id
    db.commit()
    assert browser.get(f'/clienti/{cliente.cliente_id}').status_code == 200
    for dati in ({'cliente_ruolo': 3}, {'utente_username': 'Nuovo'}, {'utente_padre': None}):
        assert browser.put(f'/clienti/{cliente.cliente_id}', json=dati).status_code == 403


def test_gerarchia_utenti_rifiuta_cicli(gestore):
    browser, _, _ = gestore()
    padre = crea_persona(browser)
    figlio = crea_persona(browser, dati_persona(1) | {'padre_utente_id': padre['utente_id']})
    risposta = browser.put(f"/clienti/{padre['cliente_id']}", json={'utente_padre': figlio['utente_id']})
    assert risposta.status_code == 422


def test_ricerca_multi_parola_filtri_e_pagine_stabili(gestore):
    browser, _, _ = gestore()
    centro = crea_centro(browser)
    persone = [crea_persona(browser, dati_persona(i, 1 if i < 2 else 3) |
                           {'azienda_id': centro['azienda_id']}) for i in range(3)]
    percorso = f"/clienti/?tipo=attuatore&centro={centro['azienda_id']}&ruolo=1&search=Prova%20Persona&limit=1"
    prima = browser.get(percorso).json()
    seconda = browser.get(percorso + '&skip=1').json()
    assert prima['totale'] == seconda['totale'] == 2
    assert prima['altri'] and not seconda['altri']
    assert prima['elementi'][0]['cliente_id'] == persone[0]['cliente_id']
    assert seconda['elementi'][0]['cliente_id'] == persone[1]['cliente_id']
    assert 'cliente_documento' not in prima['elementi'][0]
    assert 'cliente_email' not in prima['elementi'][0]
    assert browser.get('/clienti/?tipo=attuatore&search=%25').json()['totale'] == 0
    assert browser.get('/clienti/?tipo=attuatore&skip=-1').status_code == 422
    assert browser.get('/clienti/?tipo=attuatore&limit=101').status_code == 422


def test_selettore_paginato_oltre_quaranta_risultati(db, gestore):
    browser, autore, _ = gestore()
    for numero in range(45):
        db.add(Cliente(utente_id=autore.utente_id, cliente_ruolo=1,
                       cliente_nome=f'Selezione {numero:02}', cliente_cognome='Prova'))
    db.commit()
    prima = browser.get('/anagrafiche/opzioni/attuatori?search=Selezione&limit=40').json()
    seconda = browser.get('/anagrafiche/opzioni/attuatori?search=Selezione&limit=40&skip=40').json()
    assert len(prima['elementi']) == 40 and prima['altri']
    assert len(seconda['elementi']) == 5 and not seconda['altri']
    assert set(prima['elementi'][0]) == {'id', 'utente_id', 'label'}
