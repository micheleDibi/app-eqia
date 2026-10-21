"""Contratti comuni fra elenchi, creazione e schede di dettaglio."""
from collections import Counter
from datetime import datetime

import pytest

from gestione_supporto import gestore, crea_centro, crea_persona, dati_centro, dati_persona
from src.clienti.models import Cliente
from src.main import app


def test_ogni_percorso_api_ha_un_solo_gestore():
    percorsi = Counter((metodo, rotta.path) for rotta in app.routes
                       for metodo in getattr(rotta, 'methods', []))
    assert not {percorso: numero for percorso, numero in percorsi.items() if numero > 1}


def test_centro_creato_dal_business_apribile_modificabile_e_associabile(gestore):
    browser, _, _ = gestore(2)
    centro = crea_centro(browser)
    persona = crea_persona(browser)
    identita = centro['azienda_id']
    assert browser.get(f'/aziende/{identita}').status_code == 200
    trovato = browser.get(f"/aziende/partita-iva/{centro['azienda_partitaIVA']}")
    assert trovato.status_code == 200 and trovato.json()['azienda_id'] == identita
    risposta = browser.put(f"/clienti/{persona['cliente_id']}/centro", json={'azienda_id': identita})
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()['centro']['azienda_id'] == identita
    assert browser.put(f'/aziende/{identita}', json={'azienda_civico': '42'}).status_code == 200


def test_sottocentro_della_rete_apribile_e_gerarchia_visibile(gestore):
    admin, _, _ = gestore()
    browser, _, _ = gestore(2)
    padre = crea_centro(browser)
    figlio = crea_centro(admin, dati_centro(1) | {'azienda_padre_id': padre['azienda_id']})
    dettaglio = browser.get(f"/aziende/{figlio['azienda_id']}")
    assert dettaglio.status_code == 200, dettaglio.text
    assert dettaglio.json()['padre_nome'] == padre['azienda_ragione_sociale']
    assert dettaglio.json()['permessi']['gerarchia'] is False


def test_collegamenti_sottoscrittore_salvati_e_non_persi_con_un_altro_campo(db, gestore):
    browser, _, _ = gestore()
    centro = crea_centro(browser)
    attuatore = crea_persona(browser)
    persona = crea_persona(browser, dati_persona(1, None))
    percorso = f"/clienti/{persona['cliente_id']}"
    collegamenti = {'azienda_id': centro['azienda_id'], 'attuatore_id': attuatore['cliente_id']}
    risposta = browser.put(percorso, json=collegamenti)
    assert risposta.status_code == 200, risposta.text
    for nome, valore in collegamenti.items():
        assert risposta.json()[nome] == valore
    assert risposta.json()['attuatore_nome']
    assert browser.put(percorso, json={'cliente_nome': 'Lia'}).status_code == 200
    db.rollback()
    riga = db.get(Cliente, persona['cliente_id'])
    assert riga.azienda_id == centro['azienda_id'] and riga.attuatore_id == attuatore['cliente_id']
    assert browser.put(percorso, json={'azienda_id': None, 'attuatore_id': None}).status_code == 200
    assert browser.get(percorso).json()['attuatore_id'] is None


@pytest.mark.parametrize('campo', ['azienda_id', 'attuatore_id'])
def test_sottoscrittore_non_collegabile_fuori_rete(gestore, campo):
    admin, _, _ = gestore()
    esterno = crea_centro(admin) if campo == 'azienda_id' else crea_persona(admin)
    browser, _, _ = gestore(2)
    persona = crea_persona(browser, dati_persona(1, None))
    identita = esterno['azienda_id' if campo == 'azienda_id' else 'cliente_id']
    risposta = browser.put(f"/clienti/{persona['cliente_id']}", json={campo: identita})
    assert risposta.status_code == 404, risposta.text


def test_cambio_cellulare_normalizzato_e_da_verificare(db, gestore):
    browser, _, _ = gestore()
    persona = crea_persona(browser)
    percorso = f"/clienti/{persona['cliente_id']}"
    risposta = browser.put(percorso, json={'cliente_cellulare': '333 123 9876'})
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()['cliente_cellulare'] == '+393331239876'
    assert browser.put(percorso, json={'cliente_cellulare': 'non-valido'}).status_code == 422
    contatti = browser.get(percorso + '/contatti').json()
    assert contatti['cellulare']['verificato'] is False


def test_cronologia_aggiornata_anche_solo_per_dati_personali(db, gestore):
    browser, autore, _ = gestore()
    persona = crea_persona(browser)
    db.rollback()
    utente = db.get(Cliente, persona['cliente_id']).utente
    utente.utente_updated_by = autore.utente_id
    utente.utente_updated_at = datetime(2020, 1, 1)
    db.commit()
    risposta = browser.put(f"/clienti/{persona['cliente_id']}", json={'cliente_cittadinanza': 'Francese'})
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()['account']['aggiornato_il'] > '2020-01-01T00:00:00'
    assert risposta.json()['account']['aggiornato_da']['utente_id'] == autore.utente_id


def test_promozione_cambia_elenco_e_conserva_account(gestore):
    browser, _, _ = gestore()
    persona = crea_persona(browser, dati_persona(ruolo=None))
    risposta = browser.put(f"/clienti/{persona['cliente_id']}", json={'cliente_ruolo': 1})
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()['account']['utente_id'] == persona['utente_id']
    elenco = browser.get('/clienti/?tipo=attuatore').json()['elementi']
    assert persona['cliente_id'] in {r['cliente_id'] for r in elenco}
    assert browser.get('/clienti/?tipo=sottoscrittore').json()['totale'] == 0
