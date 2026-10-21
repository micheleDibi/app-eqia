"""Scheda di un centro (src/aziende/scheda.py): lettura, salvataggio,
attuatori collegati e chi la apre."""
import pytest

from src.aziende.models import Azienda
from test_scheda_anagrafica import BUSINESS, EDUCATION, NAZIONALE, STARTUP, entra, figlio_di  # noqa: F401


def nuovo_centro(db, nome="Centro Nord", partita_iva="01234567890", **campi):
    centro = Azienda(azienda_ragione_sociale=nome, azienda_partitaIVA=partita_iva, azienda_codiceFiscale=partita_iva,
                     azienda_via="Via Roma", azienda_citta="Milano", azienda_CAP="20100", azienda_provincia="MI",
                     **campi)
    db.add(centro)
    db.commit()
    return centro


def nel_centro(db, persona, centro):
    persona.azienda_id = centro.azienda_id
    db.commit()


def test_il_nazionale_legge_il_centro_con_i_suoi_attuatori(db, account, entra):
    nazionale, _, browser = entra(NAZIONALE)
    centro = nuovo_centro(db, azienda_email="nord@example.org", azienda_codice_nazionale="EQ-0001")
    _, bianchi = figlio_di(db, account, nazionale, STARTUP)
    bianchi.cliente_cognome = "Bianchi"
    _, verdi = figlio_di(db, account, nazionale, BUSINESS)
    verdi.cliente_cognome = "Verdi"
    _, sottoscrittore = figlio_di(db, account, nazionale, None)
    for persona in (bianchi, verdi, sottoscrittore):
        nel_centro(db, persona, centro)

    risposta = browser.get(f"/aziende/{centro.azienda_id}")
    assert risposta.status_code == 200, risposta.text
    scheda = risposta.json()
    assert scheda["azienda_ragione_sociale"] == "Centro Nord"
    assert scheda["azienda_email"] == "nord@example.org" and scheda["azienda_codice_nazionale"] == "EQ-0001"
    assert scheda["permessi"] == {"anagrafici": True}
    # Solo gli attuatori, per cognome: il sottoscrittore del centro non c'e'.
    assert [(a["cliente_cognome"], a["cliente_ruolo"]) for a in scheda["attuatori"]] == [
        ("Bianchi", STARTUP), ("Verdi", BUSINESS)]


def test_business_vede_solo_il_proprio_centro_e_gli_attuatori_della_sua_rete(db, account, entra):
    business, persona_business, browser = entra(BUSINESS)
    proprio, altro = nuovo_centro(db), nuovo_centro(db, "Centro Sud", "09876543210")
    nel_centro(db, persona_business, proprio)
    _, figlia = figlio_di(db, account, business, STARTUP)
    nel_centro(db, figlia, proprio)
    _, estranea = account(EDUCATION)
    nel_centro(db, estranea, proprio)

    scheda = browser.get(f"/aziende/{proprio.azienda_id}").json()
    assert scheda["permessi"] == {"anagrafici": False}
    assert {a["cliente_id"] for a in scheda["attuatori"]} == {persona_business.cliente_id, figlia.cliente_id}
    for percorso in (f"/aziende/{altro.azienda_id}", "/aziende/999999"):
        assert browser.get(percorso).json() == {"detail": "Centro non trovato."}
        assert browser.put(percorso, json={"azienda_telefono": "02 1"}).status_code == 404


def test_startup_non_apre_le_schede_dei_centri(db, account, entra):
    _, persona, browser = entra(STARTUP)
    centro = nuovo_centro(db)
    nel_centro(db, persona, centro)

    assert browser.get(f"/aziende/{centro.azienda_id}").status_code == 403
    assert browser.put(f"/aziende/{centro.azienda_id}", json={"azienda_telefono": "02 1"}).status_code == 403


def test_business_salva_sede_e_contatti_ma_non_i_dati_anagrafici(db, account, entra):
    _, persona, browser = entra(BUSINESS)
    centro = nuovo_centro(db)
    nel_centro(db, persona, centro)

    risposta = browser.put(f"/aziende/{centro.azienda_id}", json={
        "azienda_ragione_sociale": "Centro Nord", "azienda_civico": " 12 ", "azienda_telefono": "02 1234567",
        "azienda_sitoWeb": "",
    })
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()["azienda_civico"] == "12" and risposta.json()["azienda_telefono"] == "02 1234567"
    assert risposta.json()["azienda_sitoWeb"] is None

    risposta = browser.put(f"/aziende/{centro.azienda_id}", json={"azienda_ragione_sociale": "Altro nome"})
    assert risposta.status_code == 403
    assert risposta.json()["detail"] == "Solo il Nazionale può modificare i dati anagrafici del centro."


@pytest.mark.parametrize("corpo,stato,messaggio", [
    ({"azienda_partitaIVA": "0123456789"}, 422, "La partita IVA deve essere di 11 cifre."),
    ({"azienda_citta": "  "}, 422, "La città è obbligatoria."),
    ({"azienda_codiceFiscale": ""}, 422, "Il codice fiscale è obbligatorio."),
    ({"azienda_pec": "pec@dominio"}, 422, "PEC non valida: formato non conforme."),
    ({"azienda_partitaIVA": "09876543210"}, 409, "Esiste già un centro con questa partita IVA."),
    ({"azienda_telefono": "02 7654321"}, 409, "Esiste già un centro con questo telefono."),
    ({"azienda_email": "sud@example.org"}, 409, "Esiste già un centro con questa email."),
])
def test_rifiuta_un_valore_nuovo_non_valido(db, entra, corpo, stato, messaggio):
    _, _, browser = entra(NAZIONALE)
    centro = nuovo_centro(db)
    nuovo_centro(db, "Centro Sud", "09876543210", azienda_telefono="02 7654321", azienda_email="sud@example.org")

    risposta = browser.put(f"/aziende/{centro.azienda_id}", json={"azienda_via": "Via Nuova", **corpo})
    assert risposta.status_code == stato
    assert risposta.json()["detail"] == messaggio
    db.refresh(centro)
    assert centro.azienda_via == "Via Roma"


def test_un_doppione_gia_salvato_e_non_toccato_non_blocca_il_resto(db, entra):
    _, _, browser = entra(NAZIONALE)
    centro = nuovo_centro(db, azienda_telefono="02 1")
    nuovo_centro(db, "Centro Sud", "09876543210", azienda_telefono="02 1")

    risposta = browser.put(f"/aziende/{centro.azienda_id}", json={"azienda_telefono": "02 1", "azienda_civico": "3"})
    assert risposta.status_code == 200, risposta.text


def test_il_codice_nazionale_non_si_cambia(db, entra):
    _, _, browser = entra(NAZIONALE)
    centro = nuovo_centro(db, azienda_codice_nazionale="EQ-0001")
    risposta = browser.put(f"/aziende/{centro.azienda_id}", json={"azienda_codice_nazionale": "EQ-9999"})
    assert risposta.status_code == 422


def test_la_scheda_dell_attuatore_mostra_solo_un_centro_visibile(db, account, entra):
    business, persona_business, browser = entra(BUSINESS)
    proprio, altro = nuovo_centro(db), nuovo_centro(db, "Centro Sud", "09876543210")
    nel_centro(db, persona_business, proprio)
    _, nel_proprio = figlio_di(db, account, business, STARTUP)
    nel_centro(db, nel_proprio, proprio)
    _, nell_altro = figlio_di(db, account, business, STARTUP)
    nel_centro(db, nell_altro, altro)

    scheda = browser.get(f"/clienti/{nel_proprio.cliente_id}").json()
    assert scheda["centro"]["apribile"] is True and scheda["centro_nascosto"] is False
    scheda = browser.get(f"/clienti/{nell_altro.cliente_id}").json()
    assert scheda["centro"] is None and scheda["centro_nascosto"] is True
    assert scheda["permessi"]["centro"] is False


def test_startup_vede_il_proprio_centro_senza_poterlo_aprire_ne_cambiare(db, entra):
    _, persona, browser = entra(STARTUP)
    nel_centro(db, persona, nuovo_centro(db))

    scheda = browser.get(f"/clienti/{persona.cliente_id}").json()
    assert scheda["centro"]["ragione_sociale"] == "Centro Nord" and scheda["centro"]["apribile"] is False
    assert scheda["permessi"]["centro"] is False


def test_ricerca_per_partita_iva_fra_i_centri_visibili(db, entra):
    _, persona, browser = entra(BUSINESS)
    proprio, altro = nuovo_centro(db), nuovo_centro(db, "Centro Sud", "09876543210")
    nel_centro(db, persona, proprio)

    trovato = browser.get("/aziende/partita-iva/01234567890")
    assert trovato.status_code == 200, trovato.text
    assert trovato.json() == {"azienda_id": proprio.azienda_id, "azienda_ragione_sociale": "Centro Nord"}
    # Un centro che non si vede risponde come uno che non c'e'.
    for partita_iva in ("09876543210", "11111111111"):
        risposta = browser.get(f"/aziende/partita-iva/{partita_iva}")
        assert risposta.status_code == 404
        assert risposta.json()["detail"] == "Nessun centro trovato con questa partita IVA."
    assert browser.get("/aziende/partita-iva/0123456789").status_code == 422
    assert browser.get("/aziende/partita-iva/0123456789a").status_code == 422

    _, _, nazionale = entra(NAZIONALE)
    assert nazionale.get("/aziende/partita-iva/09876543210").json()["azienda_id"] == altro.azienda_id
    _, _, startup = entra(STARTUP)
    assert startup.get("/aziende/partita-iva/01234567890").status_code == 403


def test_il_nazionale_associa_cambia_e_rimuove_il_centro(db, account, entra):
    nazionale, _, browser = entra(NAZIONALE)
    nord, sud = nuovo_centro(db), nuovo_centro(db, "Centro Sud", "09876543210")
    _, persona = figlio_di(db, account, nazionale, STARTUP)
    percorso = f"/clienti/{persona.cliente_id}/centro"

    for centro in (nord, sud):
        risposta = browser.put(percorso, json={"azienda_id": centro.azienda_id})
        assert risposta.status_code == 200, risposta.text
        assert risposta.json()["centro"]["azienda_id"] == centro.azienda_id
        # Una lettura nuova: la transazione del test era cominciata prima del PUT.
        db.rollback()
        assert persona.azienda_id == centro.azienda_id

    risposta = browser.put(percorso, json={"azienda_id": None})
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()["centro"] is None and risposta.json()["permessi"]["centro"] is True
    db.rollback()
    assert persona.azienda_id is None

    assert browser.put(percorso, json={"azienda_id": 999999}).json() == {"detail": "Centro non trovato."}
    assert browser.put(percorso, json={}).status_code == 422
    assert browser.put(percorso, json={"azienda_id": nord.azienda_id, "ruolo": 1}).status_code == 422


def test_business_associa_solo_il_proprio_centro(db, account, entra):
    business, persona_business, browser = entra(BUSINESS)
    proprio, altro = nuovo_centro(db), nuovo_centro(db, "Centro Sud", "09876543210")
    nel_centro(db, persona_business, proprio)
    _, senza_centro = figlio_di(db, account, business, STARTUP)
    _, nell_altro = figlio_di(db, account, business, STARTUP)
    nel_centro(db, nell_altro, altro)

    percorso = f"/clienti/{senza_centro.cliente_id}/centro"
    assert browser.get(f"/clienti/{senza_centro.cliente_id}").json()["permessi"]["centro"] is True
    risposta = browser.put(percorso, json={"azienda_id": altro.azienda_id})
    assert risposta.status_code == 403 and risposta.json()["detail"] == "Non puoi assegnare questo centro."
    assert browser.put(percorso, json={"azienda_id": proprio.azienda_id}).status_code == 200
    assert browser.put(percorso, json={"azienda_id": None}).status_code == 200

    # Un centro che non vede non lo cambia ne' lo toglie.
    for corpo in ({"azienda_id": proprio.azienda_id}, {"azienda_id": None}):
        risposta = browser.put(f"/clienti/{nell_altro.cliente_id}/centro", json=corpo)
        assert risposta.status_code == 403 and risposta.json()["detail"] == "Non puoi assegnare questo centro."
    db.rollback()
    assert nell_altro.azienda_id == altro.azienda_id


def test_solo_il_nazionale_cambia_il_proprio_centro(db, entra):
    _, persona, browser = entra(BUSINESS)
    centro = nuovo_centro(db)
    nel_centro(db, persona, centro)
    assert browser.get(f"/clienti/{persona.cliente_id}").json()["permessi"]["centro"] is False
    risposta = browser.put(f"/clienti/{persona.cliente_id}/centro", json={"azienda_id": None})
    assert risposta.status_code == 403
    assert risposta.json()["detail"] == "Solo il Nazionale può cambiare il centro della propria anagrafica."

    _, nazionale, browser = entra(NAZIONALE)
    risposta = browser.put(f"/clienti/{nazionale.cliente_id}/centro", json={"azienda_id": centro.azienda_id})
    assert risposta.status_code == 200, risposta.text


def test_il_centro_si_associa_solo_agli_attuatori_della_propria_rete(db, account, entra):
    business, persona_business, browser = entra(BUSINESS)
    centro = nuovo_centro(db)
    nel_centro(db, persona_business, centro)
    _, sottoscrittore = figlio_di(db, account, business, None)
    _, estranea = account(STARTUP)

    assert browser.get(f"/clienti/{sottoscrittore.cliente_id}").json()["permessi"]["centro"] is False
    risposta = browser.put(f"/clienti/{sottoscrittore.cliente_id}/centro", json={"azienda_id": centro.azienda_id})
    assert risposta.status_code == 422 and risposta.json()["detail"] == "Il centro si associa solo agli attuatori."
    risposta = browser.put(f"/clienti/{estranea.cliente_id}/centro", json={"azienda_id": centro.azienda_id})
    assert risposta.status_code == 404 and risposta.json()["detail"] == "Anagrafica non trovata."


def test_startup_non_cambia_centri(db, account, entra):
    startup, persona, browser = entra(STARTUP)
    centro = nuovo_centro(db)
    nel_centro(db, persona, centro)
    _, figlia = figlio_di(db, account, startup, STARTUP)

    risposta = browser.put(f"/clienti/{figlia.cliente_id}/centro", json={"azienda_id": centro.azienda_id})
    assert risposta.status_code == 403
    db.rollback()
    assert figlia.azienda_id is None
