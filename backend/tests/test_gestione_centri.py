"""Centri, associazioni e vincoli della gerarchia."""
import pytest

from gestione_supporto import gestore, crea_centro, crea_persona, dati_centro, dati_persona
from src.aziende.models import Azienda


def test_creazione_centro_e_sottocentro_con_collegamenti(gestore):
    browser, _, _ = gestore()
    padre = crea_centro(browser)
    figlio = crea_centro(browser, dati_centro(1) | {'azienda_padre_id': padre['azienda_id']})
    persona = crea_persona(browser, dati_persona() | {'azienda_id': figlio['azienda_id']})
    assert figlio['padre_nome'] == padre['azienda_ragione_sociale']
    assert persona['centro_nome'] == figlio['azienda_ragione_sociale']
    figli = browser.get(f"/aziende/{padre['azienda_id']}/figli").json()
    assert figli['elementi'] == [{'id': figlio['azienda_id'], 'label': figlio['azienda_ragione_sociale']}]
    assert browser.get(f"/clienti/?tipo=attuatore&centro={figlio['azienda_id']}").json()['totale'] == 1


def test_nessun_ciclo_tra_centri(gestore):
    browser, _, _ = gestore()
    padre = crea_centro(browser)
    figlio = crea_centro(browser, dati_centro(1) | {'azienda_padre_id': padre['azienda_id']})
    for destinazione in (padre['azienda_id'], figlio['azienda_id']):
        risposta = browser.put(f"/aziende/{padre['azienda_id']}", json=dati_centro() |
                               {'azienda_padre_id': destinazione})
        assert risposta.status_code == 422


@pytest.mark.parametrize('ruolo', [1, 3])
def test_startup_non_amministra_centri_ma_puo_selezionare_quello_di_appartenenza(db, gestore, ruolo):
    admin, _, _ = gestore()
    browser, _, cliente = gestore(ruolo)
    centro = crea_centro(admin)
    cliente.azienda_id = centro['azienda_id']
    db.commit()
    assert browser.get('/aziende/').status_code == 403
    assert browser.post('/aziende/', json=dati_centro(1)).status_code == 403
    assert browser.get(f"/aziende/{centro['azienda_id']}").status_code == 403
    opzioni = browser.get('/anagrafiche/opzioni/centri').json()['elementi']
    assert opzioni == [{'id': centro['azienda_id'], 'label': centro['azienda_ragione_sociale']}]
    riga = crea_persona(browser, dati_persona(ruolo=None) | {'azienda_id': centro['azienda_id']})
    assert riga['azienda_id'] == centro['azienda_id']


def test_business_vede_centri_creati_e_figli_ma_non_altra_rete(gestore):
    admin, _, _ = gestore()
    browser, _, _ = gestore(2)
    esterno = crea_centro(admin)
    padre = crea_centro(browser, dati_centro(1))
    figlio = crea_centro(admin, dati_centro(2) | {'azienda_padre_id': padre['azienda_id']})
    elenco = browser.get('/aziende/').json()
    assert {c['azienda_id'] for c in elenco['elementi']} == {padre['azienda_id'], figlio['azienda_id']}
    for path in (f"/aziende/{esterno['azienda_id']}", f"/aziende/{esterno['azienda_id']}/figli"):
        assert browser.get(path).status_code == 404
    assert browser.get(f"/anagrafiche/opzioni/centri?id={esterno['azienda_id']}").json()['elementi'] == []
    assert browser.post('/aziende/', json=dati_centro(3) | {'azienda_padre_id': esterno['azienda_id']}).status_code == 404
    assert browser.post('/clienti/?tipo=attuatore', json=dati_persona() |
                        {'azienda_id': esterno['azienda_id']}).status_code == 404


def test_business_modifica_recapiti_ma_non_identita_ne_gerarchia(gestore):
    browser, _, _ = gestore(2)
    centro = crea_centro(browser)
    risposta = browser.put(f"/aziende/{centro['azienda_id']}", json=dati_centro() |
                           {'azienda_email': 'centro@example.org'})
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()['azienda_email'] == 'centro@example.org'
    risposta = browser.put(f"/aziende/{centro['azienda_id']}", json=dati_centro() |
                           {'azienda_ragione_sociale': 'Identita modificata'})
    assert risposta.status_code == 403
    altro = crea_centro(browser, dati_centro(1))
    risposta = browser.put(f"/aziende/{centro['azienda_id']}", json=dati_centro() |
                           {'azienda_padre_id': altro['azienda_id']})
    assert risposta.status_code == 403


def test_duplicati_centri_aggiornamento_e_codice_stabile(db, gestore):
    browser, _, _ = gestore()
    centro = crea_centro(browser)
    assert browser.post('/aziende/', json=dati_centro()).status_code == 409
    risposta = browser.put(f"/aziende/{centro['azienda_id']}", json=dati_centro() |
                           {'azienda_citta': 'Milano', 'azienda_provincia': 'mi'})
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()['azienda_provincia'] == 'MI'
    assert risposta.json()['azienda_codice_nazionale'] == centro['azienda_codice_nazionale']
    db.rollback()
    assert db.query(Azienda).count() == 1
