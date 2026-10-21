"""Username e gerarchia degli account dalle schede anagrafiche."""
import pytest
from src.aziende.models import Azienda
from test_scheda_anagrafica import BUSINESS, EDUCATION, NAZIONALE, STARTUP, entra, figlio_di  # noqa: F401


# =============================================================================
# Nome utente e utente padre
# =============================================================================
def test_il_nazionale_cambia_nome_utente_e_padre(db, account, entra):
    nazionale, _, browser = entra(NAZIONALE)
    utente, persona = figlio_di(db, account, nazionale, STARTUP)
    nuovo_padre, padre = figlio_di(db, account, nazionale, BUSINESS)
    padre.cliente_nome, padre.cliente_cognome = "Bruno", "Bianchi"
    db.commit()

    risposta = browser.put(f"/clienti/{persona.cliente_id}", json={
        "utente_username": "  AnnaRossi.nuovo ", "utente_padre": nuovo_padre.utente_id,
    })
    assert risposta.status_code == 200, risposta.text
    account_salvato = risposta.json()["account"]
    assert account_salvato["username"] == "AnnaRossi.nuovo"
    assert account_salvato["padre"] == {"utente_id": nuovo_padre.utente_id, "nome": "Bruno Bianchi"}
    assert account_salvato["aggiornato_da"]["utente_id"] == nazionale.utente_id
    # Una lettura nuova: la transazione del test era cominciata prima del PUT.
    db.rollback()
    assert utente.utente_padre == nuovo_padre.utente_id


@pytest.mark.parametrize("username,stato,messaggio", [
    ("   ", 422, "Il nome utente non può essere vuoto."),
    ("PERSONA1.TEST", 409, "Esiste già un utente registrato con questo username."),
])
def test_nome_utente_vuoto_o_gia_usato(db, account, entra, username, stato, messaggio):
    # Il Nazionale e' persona1.test: maiuscole e minuscole non contano.
    nazionale, _, browser = entra(NAZIONALE)
    _, persona = figlio_di(db, account, nazionale, STARTUP)

    risposta = browser.put(f"/clienti/{persona.cliente_id}", json={"utente_username": username})
    assert risposta.status_code == stato
    assert risposta.json()["detail"] == messaggio


def test_il_proprio_nome_utente_si_scrive_con_maiuscole_diverse(db, account, entra):
    nazionale, persona, browser = entra(NAZIONALE)
    risposta = browser.put(f"/clienti/{persona.cliente_id}", json={"utente_username": "Persona1.Test"})
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()["account"]["username"] == "Persona1.Test"


def test_il_padre_e_un_attuatore_non_se_stesso_e_senza_giri(db, account, entra):
    nazionale, _, browser = entra(NAZIONALE)
    utente, persona = figlio_di(db, account, nazionale, STARTUP)
    figlio, _ = figlio_di(db, account, utente, STARTUP)
    nipote, _ = figlio_di(db, account, figlio, EDUCATION)
    sottoscrittore, _ = figlio_di(db, account, nazionale, None)

    for padre, messaggio in (
        (utente.utente_id, "Un utente non può essere padre di se stesso."),
        (sottoscrittore.utente_id, "L'utente padre deve essere un attuatore."),
        (999999, "L'utente padre deve essere un attuatore."),
        (None, "L'utente padre deve essere un attuatore."),
        (nipote.utente_id, "L'attuatore scelto dipende già da questo utente: non può esserne il padre."),
    ):
        risposta = browser.put(f"/clienti/{persona.cliente_id}", json={"utente_padre": padre})
        assert risposta.status_code == 422, padre
        assert risposta.json()["detail"] == messaggio
    db.refresh(utente)
    assert utente.utente_padre == nazionale.utente_id


def test_fuori_dal_nazionale_nome_utente_e_padre_bloccati(db, account, entra):
    business, persona_business, browser = entra(BUSINESS)
    utente, figlia = figlio_di(db, account, business, STARTUP)

    permessi = browser.get(f"/clienti/{figlia.cliente_id}").json()["permessi"]
    assert permessi["username"] is False and permessi["padre"] is False
    for corpo in ({"utente_username": "AltroNome"}, {"utente_padre": persona_business.utente_id + 99}):
        risposta = browser.put(f"/clienti/{figlia.cliente_id}", json=corpo)
        assert risposta.status_code == 403
        assert risposta.json()["detail"] == "Solo il Nazionale può cambiare il nome utente o l'utente padre."
    # Rimandare i valori gia' salvati non e' un cambio e passa.
    risposta = browser.put(f"/clienti/{figlia.cliente_id}", json={
        "utente_username": utente.utente_username, "utente_padre": business.utente_id, "cliente_nome": "Lia"})
    assert risposta.status_code == 200, risposta.text
    assert browser.get(f"/clienti/{figlia.cliente_id}/padri").status_code == 403


def test_padri_possibili_per_nome_cognome_centro_e_ruolo(db, account, entra):
    nazionale, _, browser = entra(NAZIONALE)
    centro = Azienda(azienda_ragione_sociale="Centro Nord", azienda_partitaIVA="01234567890", azienda_via="Via Roma",
                     azienda_citta="Milano", azienda_CAP="20100", azienda_provincia="MI")
    db.add(centro)
    db.flush()
    _, persona = figlio_di(db, account, nazionale, STARTUP)
    _, verdi = figlio_di(db, account, nazionale, BUSINESS)
    verdi.cliente_cognome, verdi.azienda_id = "Verdi", centro.azienda_id
    _, bianchi = figlio_di(db, account, nazionale, EDUCATION)
    bianchi.cliente_cognome = "Bianchi"
    figlio_di(db, account, nazionale, None)  # sottoscrittore: non e' un padre possibile
    db.commit()

    def cerca(**parametri):
        risposta = browser.get(f"/clienti/{persona.cliente_id}/padri", params=parametri)
        assert risposta.status_code == 200, risposta.text
        return risposta.json()

    tutti = cerca()
    # Il Nazionale e gli attuatori, per cognome; non la persona della scheda.
    assert [v["cliente_cognome"] for v in tutti["voci"]] == ["Bianchi", "Rossi", "Verdi"]
    assert persona.cliente_id not in {v["cliente_id"] for v in tutti["voci"]} and tutti["altri"] is False
    assert [v["cliente_id"] for v in cerca(cerca="nord")["voci"]] == [verdi.cliente_id]
    assert cerca(cerca="Nord")["voci"][0]["centro"] == "Centro Nord"
    assert [v["cliente_id"] for v in cerca(ruolo=EDUCATION)["voci"]] == [bianchi.cliente_id]
    # Ogni parola deve comparire: tutte le persone della prova si chiamano Anna.
    assert [v["cliente_id"] for v in cerca(cerca="anna bianchi")["voci"]] == [bianchi.cliente_id]
    assert cerca(cerca="mario bianchi")["voci"] == []


def test_padri_possibili_a_pagine(db, account, entra, monkeypatch):
    from src.clienti import scheda
    monkeypatch.setattr(scheda, "LIMITE_PADRI", 2)
    nazionale, _, browser = entra(NAZIONALE)
    _, persona = figlio_di(db, account, nazionale, STARTUP)
    for _ in range(3):
        figlio_di(db, account, nazionale, STARTUP)

    prima = browser.get(f"/clienti/{persona.cliente_id}/padri").json()
    seconda = browser.get(f"/clienti/{persona.cliente_id}/padri", params={"dopo": 2}).json()
    assert len(prima["voci"]) == 2 and prima["altri"] is True
    assert len(seconda["voci"]) == 2 and seconda["altri"] is False
    assert not {v["cliente_id"] for v in prima["voci"]} & {v["cliente_id"] for v in seconda["voci"]}
