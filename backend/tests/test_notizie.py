"""Le notizie del Nazionale (src/notizie/): sezioni e argomenti, destinatari
per gruppi, chi vede e chi scrive, modifica, eliminazione, immagine,
allegati e letture."""
import re
from contextlib import ExitStack
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from src.clienti.models import Cliente
from src.main import app
from src.notifiche.backend_invio import backend_memoria
from src.notizie.archivio import archivio_memoria, cartella_notizia, get_archivio
from conftest import PASSWORD

BUSINESS, STARTUP, EDUCATION, NAZIONALE = 2, 1, 3, 5
BANDI, FORMAZIONE, MONDO, SPENTO = 1, 2, 3, 4
REGIONALI, EUROPEI, ITALIA, CORSI = 1, 2, 3, 4
TUTTI = ["business", "startup", "startup-for-education"]

PNG = b"\x89PNG\r\n\x1a\n" + b"immagine di prova"
JPG = b"\xff\xd8\xff\xe0" + b"foto di prova"


@pytest.fixture
def notizie(db):
    """Sezioni e argomenti di prova: Bandi e Mondo con argomenti attivi,
    Formazione con il solo argomento disattivato, piu' una sezione spenta."""
    db.execute(text("INSERT INTO tag VALUES (1, 'Bandi', -1), (2, 'Formazione', -1), (3, 'Mondo', -1),"
                    " (4, 'Spento', 0)"))
    db.execute(text("INSERT INTO tag_dettaglio VALUES (1, 1, 'Bandi regionali', -1), (2, 1, 'Bandi europei', -1),"
                    " (3, 3, 'Italia', -1), (4, 2, 'Corsi', 0)"))
    db.commit()


@pytest.fixture
def archivio():
    memoria = archivio_memoria()
    memoria.svuota()
    app.dependency_overrides[get_archivio] = lambda: memoria
    yield memoria
    app.dependency_overrides.pop(get_archivio, None)
    memoria.svuota()


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
                messaggio = backend_memoria().inviate[-1].get_body(preferencelist=("plain",)).get_content()
                codice = re.search(r"\b\d{6}\b", messaggio).group()
                risposta = browser.post("/auth/verifica-otp", json={"sfida": risposta.json()["sfida"], "codice": codice})
                assert risposta.status_code == 200, risposta.text
            browser.headers["X-CSRF-Token"] = risposta.json()["csrf_token"]
            return utente, browser
        yield entra


def corpo(**valori):
    return {
        "notizia_titolo": "Chiusura uffici",
        "notizia_sottotitolo": "Gli uffici restano chiusi venerdì",
        "notizia_riassunto": "",
        "notizia_descrizione": "Si avvisano tutti i centri.\nVenerdì gli uffici restano chiusi.",
        "notizia_url": "",
        "tag_id": BANDI,
        "gruppi": TUTTI,
        **valori,
    }


def crea(browser, **valori):
    risposta = browser.post("/notizie/", json=corpo(**valori))
    assert risposta.status_code == 201, risposta.text
    return risposta.json()


def destinatari(db, notizia_id):
    return set(db.execute(text("SELECT partecipante_id FROM notizia_partecipante WHERE notizia_id = :id"),
                          {"id": notizia_id}).scalars())


def riga(db, notizia_id):
    db.commit()  # una nuova lettura, non quella della transazione precedente
    return db.execute(text("SELECT * FROM notizia WHERE notizia_id = :id"), {"id": notizia_id}).mappings().first()


def conta(db, tabella):
    db.commit()
    return db.execute(text(f"SELECT COUNT(*) FROM {tabella}")).scalar_one()


# =============================================================================
# Sezioni e argomenti
# =============================================================================
def test_si_scelgono_le_sezioni_attive_con_i_loro_argomenti_attivi(accedi, notizie):
    _, startup = accedi(STARTUP)
    risposta = startup.get("/notizie/categorie")
    assert risposta.status_code == 200, risposta.text
    assert risposta.json() == [
        {"tag_id": 1, "tag_descrizione": "Bandi", "sottotag": [
            {"tag_dettaglio_id": 1, "tag_dettaglio_descrizione": "Bandi regionali"},
            {"tag_dettaglio_id": 2, "tag_dettaglio_descrizione": "Bandi europei"}]},
        {"tag_id": 2, "tag_descrizione": "Formazione", "sottotag": []},
        {"tag_id": 3, "tag_descrizione": "Mondo", "sottotag": [
            {"tag_dettaglio_id": 3, "tag_dettaglio_descrizione": "Italia"}]},
    ]


# =============================================================================
# Creazione e destinatari
# =============================================================================
def test_il_nazionale_crea_la_notizia_per_i_gruppi_scelti(db, account, accedi, notizie):
    nazionale, sessione = accedi(NAZIONALE)
    startup, _ = account(STARTUP)
    business, _ = account(BUSINESS)
    education, _ = account(EDUCATION)
    disattivato, _ = account(STARTUP, attivo=0)
    sottoscrittore, _ = account(None)

    scheda = crea(sessione, gruppi=["startup", "business"])
    assert scheda["gruppi"] == ["business", "startup"]  # nell'ordine del catalogo
    assert scheda["destinatari"] == 2
    assert scheda["modificabile"] is True
    assert destinatari(db, scheda["notizia_id"]) == {startup.utente_id, business.utente_id}
    assert {education.utente_id, disattivato.utente_id, sottoscrittore.utente_id,
            nazionale.utente_id}.isdisjoint(destinatari(db, scheda["notizia_id"]))

    salvata = riga(db, scheda["notizia_id"])
    assert salvata["notizia_descrizione"] == "Si avvisano tutti i centri.\nVenerdì gli uffici restano chiusi."
    assert salvata["notizia_riassunto"] == "" and salvata["notizia_url"] == ""
    assert salvata["notizia_immagine_filename"] is None
    assert salvata["notizia_created_by"] == salvata["notizia_updated_by"] == nazionale.utente_id


def test_tutti_i_gruppi_escludono_nazionali_e_sottoscrittori(db, account, accedi, notizie):
    nazionale, sessione = accedi(NAZIONALE)
    startup, _ = account(STARTUP)
    altro_nazionale, _ = account(NAZIONALE)
    sottoscrittore, _ = account(None)
    scheda = crea(sessione)
    assert destinatari(db, scheda["notizia_id"]) == {startup.utente_id}
    assert {nazionale.utente_id, altro_nazionale.utente_id,
            sottoscrittore.utente_id}.isdisjoint(destinatari(db, scheda["notizia_id"]))
    # I gruppi scelti, anche quelli senza nessun attivo.
    assert scheda["gruppi"] == TUTTI


def test_una_persona_con_piu_righe_clienti_e_un_solo_destinatario(db, account, accedi, notizie):
    _, sessione = accedi(NAZIONALE)
    startup, _ = account(STARTUP)
    db.add(Cliente(cliente_id=9000, utente_id=startup.utente_id, cliente_nome="Anna", cliente_cognome="Rossi",
                   cliente_email="doppia@example.org", cliente_ruolo=STARTUP))
    db.commit()
    assert crea(sessione, gruppi=["startup"])["destinatari"] == 1


@pytest.mark.parametrize("campi", [
    {"notizia_titolo": "   "},
    {"notizia_descrizione": "\n \n"},
    {"notizia_url": "javascript:alert(1)"},
    {"notizia_url": "www.esempio.invalid"},
    {"gruppi": []},
    {"gruppi": ["nazionale"]},
])
def test_campi_non_validi(db, accedi, notizie, campi):
    _, sessione = accedi(NAZIONALE)
    assert sessione.post("/notizie/", json=corpo(**campi)).status_code == 422
    assert conta(db, "notizia") == 0


@pytest.mark.parametrize("sezione", [SPENTO, 99])
def test_si_sceglie_solo_una_sezione_dell_elenco(db, accedi, notizie, sezione):
    _, sessione = accedi(NAZIONALE)
    assert sessione.post("/notizie/", json=corpo(tag_id=sezione)).status_code == 422
    assert conta(db, "notizia") == 0


def test_il_link_completo_si_salva(accedi, notizie):
    _, sessione = accedi(NAZIONALE)
    assert crea(sessione, notizia_url="  https://example.org/avviso?id=3  ")["notizia_url"] == \
        "https://example.org/avviso?id=3"


# =============================================================================
# Chi vede e chi scrive
# =============================================================================
def test_gli_altri_vedono_solo_le_notizie_di_cui_sono_destinatari(accedi, notizie):
    _, nazionale = accedi(NAZIONALE)
    _, startup = accedi(STARTUP)
    _, business = accedi(BUSINESS)
    per_startup = crea(nazionale, notizia_titolo="Alle startup", gruppi=["startup"])
    per_tutti = crea(nazionale, notizia_titolo="A tutti")

    elenco = business.get("/notizie/")
    assert elenco.status_code == 200, elenco.text
    assert [n["notizia_titolo"] for n in elenco.json()] == ["A tutti"]
    assert business.get(f"/notizie/{per_startup['notizia_id']}").status_code == 404

    # Dalla piu' recente.
    assert [n["notizia_titolo"] for n in startup.get("/notizie/").json()] == ["A tutti", "Alle startup"]
    dati = startup.get(f"/notizie/{per_tutti['notizia_id']}").json()
    assert dati["modificabile"] is False and dati["gruppi"] == [] and dati["destinatari"] is None
    assert dati["tag_descrizione"] == "Bandi"

    # Il Nazionale le vede tutte.
    assert len(nazionale.get("/notizie/").json()) == 2


def test_l_elenco_si_legge_a_pagine(accedi, notizie):
    _, sessione = accedi(NAZIONALE)
    for numero in range(1, 5):
        crea(sessione, notizia_titolo=f"Notizia {numero}")
    prima = sessione.get("/notizie/?limit=3").json()
    seconda = sessione.get("/notizie/?limit=3&skip=3").json()
    assert [n["notizia_titolo"] for n in prima] == ["Notizia 4", "Notizia 3", "Notizia 2"]
    assert [n["notizia_titolo"] for n in seconda] == ["Notizia 1"]


def test_solo_il_nazionale_scrive(db, accedi, notizie):
    _, nazionale = accedi(NAZIONALE)
    _, business = accedi(BUSINESS)
    notizia_id = crea(nazionale)["notizia_id"]
    assert business.post("/notizie/", json=corpo()).status_code == 403
    assert business.put(f"/notizie/{notizia_id}", json=corpo()).status_code == 403
    assert business.delete(f"/notizie/{notizia_id}").status_code == 403
    assert business.put(f"/notizie/{notizia_id}/immagine", content=PNG,
                        headers={"Content-Type": "image/png"}).status_code == 403
    assert business.post(f"/notizie/{notizia_id}/allegati", content=b"%PDF",
                         headers={"Content-Type": "application/pdf"}).status_code == 403
    assert conta(db, "notizia") == 1


def test_senza_sessione_non_si_vede_nulla(client, notizie):
    assert client.get("/notizie/").status_code == 401
    assert client.get("/notizie/da-leggere").status_code == 401


def test_una_notizia_inesistente_non_si_trova(accedi, notizie):
    _, sessione = accedi(NAZIONALE)
    assert sessione.get("/notizie/99").status_code == 404
    assert sessione.put("/notizie/99", json=corpo()).status_code == 404
    assert sessione.delete("/notizie/99").status_code == 404


# =============================================================================
# Modifica ed eliminazione
# =============================================================================
def test_la_modifica_ricalcola_i_destinatari(db, account, accedi, notizie):
    _, sessione = accedi(NAZIONALE)
    startup, _ = account(STARTUP)
    business, _ = account(BUSINESS)
    notizia_id = crea(sessione, gruppi=["startup"])["notizia_id"]

    arrivato, _ = account(STARTUP)
    db.execute(text("UPDATE utenti SET utente_attivoSN = 0 WHERE utente_id = :u"), {"u": startup.utente_id})
    db.commit()
    risposta = sessione.put(f"/notizie/{notizia_id}", json=corpo(
        notizia_titolo="Titolo nuovo", tag_id=MONDO, gruppi=["startup", "business"]))
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()["gruppi"] == ["business", "startup"]
    assert destinatari(db, notizia_id) == {business.utente_id, arrivato.utente_id}
    salvata = riga(db, notizia_id)
    assert salvata["notizia_titolo"] == "Titolo nuovo" and salvata["tag_id"] == MONDO

    # Chi resta destinatario tiene la sua riga; chi torna attivo rientra.
    def riga_di(persona):
        return db.execute(text("SELECT notizia_partecipante_id FROM notizia_partecipante "
                               "WHERE notizia_id = :id AND partecipante_id = :p"),
                          {"id": notizia_id, "p": persona.utente_id}).scalar_one()

    riga_arrivato = riga_di(arrivato)
    db.execute(text("UPDATE utenti SET utente_attivoSN = -1 WHERE utente_id = :u"), {"u": startup.utente_id})
    db.commit()
    assert sessione.put(f"/notizie/{notizia_id}", json=corpo(gruppi=["startup"])).status_code == 200
    db.commit()
    assert destinatari(db, notizia_id) == {startup.utente_id, arrivato.utente_id}
    assert riga_di(arrivato) == riga_arrivato


def test_i_gruppi_scelti_non_cambiano_con_il_ruolo_dei_destinatari(db, account, accedi, notizie):
    _, sessione = accedi(NAZIONALE)
    _, persona = account(STARTUP)
    notizia_id = crea(sessione, gruppi=["startup"])["notizia_id"]
    db.execute(text("UPDATE clienti SET cliente_ruolo = :r WHERE cliente_id = :c"),
               {"r": BUSINESS, "c": persona.cliente_id})
    db.commit()

    assert sessione.get(f"/notizie/{notizia_id}").json()["gruppi"] == ["startup"]
    risposta = sessione.put(f"/notizie/{notizia_id}", json=corpo(gruppi=["startup-for-education"]))
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()["gruppi"] == ["startup-for-education"]
    db.commit()
    assert set(db.execute(text("SELECT ruolo_id FROM notizia_gruppo WHERE notizia_id = :id"),
                          {"id": notizia_id}).scalars()) == {EDUCATION}


def test_l_eliminazione_toglie_le_righe_e_lascia_i_file(db, account, accedi, archivio, notizie):
    _, sessione = accedi(NAZIONALE)
    account(STARTUP)
    notizia_id = crea(sessione, sottotag=[REGIONALI])["notizia_id"]
    assert sessione.put(f"/notizie/{notizia_id}/immagine", content=PNG,
                        headers={"Content-Type": "image/png"}).status_code == 200
    assert sessione.post(f"/notizie/{notizia_id}/allegati", content=b"%PDF circolare",
                         headers={"Content-Type": "application/pdf",
                                  "X-Nome-File": quote("Circolare.pdf")}).status_code == 201
    sessione.get(f"/notizie/{notizia_id}")  # una lettura
    file_prima = set(archivio.file)

    assert sessione.delete(f"/notizie/{notizia_id}").status_code == 204
    db.commit()
    for tabella in ("notizia", "notizia_tag_dettaglio", "notizia_allegato", "notizia_partecipante",
                    "notizia_gruppo", "notizia_letta"):
        assert db.execute(text(f"SELECT COUNT(*) FROM {tabella} WHERE notizia_id = :id"),
                          {"id": notizia_id}).scalar_one() == 0, tabella
    assert set(archivio.file) == file_prima and file_prima


# =============================================================================
# Immagine
# =============================================================================
def immagine(browser, notizia_id, contenuto=PNG, tipo="image/png"):
    return browser.put(f"/notizie/{notizia_id}/immagine", content=contenuto, headers={"Content-Type": tipo})


def test_immagine_caricata_letta_e_tolta(db, accedi, archivio, notizie):
    _, sessione = accedi(NAZIONALE)
    _, startup = accedi(STARTUP)
    notizia_id = crea(sessione)["notizia_id"]
    assert startup.get(f"/notizie/{notizia_id}/immagine").status_code == 404

    risposta = immagine(sessione, notizia_id)
    assert risposta.status_code == 200, risposta.text
    assert risposta.json()["immagine"] is True
    nome = riga(db, notizia_id)["notizia_immagine_filename"]
    assert re.fullmatch(r"[A-Za-z0-9]{8}", nome)
    assert archivio.file[f"{cartella_notizia(notizia_id)}/{nome}"] == PNG

    letta = startup.get(f"/notizie/{notizia_id}/immagine")
    assert letta.status_code == 200 and letta.content == PNG
    assert letta.headers["content-type"] == "image/png"
    assert letta.headers["x-content-type-options"] == "nosniff"

    # Sostituita: nome nuovo, il file di prima resta nell'archivio.
    assert immagine(sessione, notizia_id, JPG, "image/jpeg").status_code == 200
    assert startup.get(f"/notizie/{notizia_id}/immagine").headers["content-type"] == "image/jpeg"
    assert f"{cartella_notizia(notizia_id)}/{nome}" in archivio.file

    tolta = sessione.delete(f"/notizie/{notizia_id}/immagine")
    assert tolta.status_code == 200 and tolta.json()["immagine"] is False
    assert riga(db, notizia_id)["notizia_immagine_filename"] is None
    assert startup.get(f"/notizie/{notizia_id}/immagine").status_code == 404


@pytest.mark.parametrize("contenuto, tipo", [(b"%PDF-1.4", "application/pdf"), (b"<svg></svg>", "image/svg+xml"),
                                             (b"testo", "image/png")])
def test_si_caricano_solo_immagini(db, accedi, archivio, notizie, contenuto, tipo):
    _, sessione = accedi(NAZIONALE)
    notizia_id = crea(sessione)["notizia_id"]
    assert immagine(sessione, notizia_id, contenuto, tipo).status_code == 415
    assert riga(db, notizia_id)["notizia_immagine_filename"] is None
    assert not archivio.file


def test_con_l_archivio_guasto_la_notizia_resta_senza_file(db, accedi, archivio, notizie):
    _, sessione = accedi(NAZIONALE)
    notizia_id = crea(sessione)["notizia_id"]
    archivio.guasto = True
    assert immagine(sessione, notizia_id).status_code == 503
    assert riga(db, notizia_id)["notizia_immagine_filename"] is None


def test_il_prefisso_delle_cartelle_separa_gli_ambienti(monkeypatch):
    monkeypatch.setenv("FTP_PREFISSO_CARTELLE", "staging_")
    assert cartella_notizia(12) == "/Notizie/staging_12"
    monkeypatch.setenv("FTP_PREFISSO_CARTELLE", "../x")
    from src.notizie.archivio import ArchivioDisabilitato
    assert isinstance(get_archivio(), ArchivioDisabilitato)


# =============================================================================
# Allegati
# =============================================================================
def allegato(browser, notizia_id, nome="Circolare ottobre.pdf", contenuto=b"%PDF circolare"):
    return browser.post(f"/notizie/{notizia_id}/allegati", content=contenuto,
                        headers={"Content-Type": "application/pdf", "X-Nome-File": quote(nome)})


def test_allegati_caricati_scaricati_e_tolti(db, accedi, archivio, notizie):
    nazionale, sessione = accedi(NAZIONALE)
    _, startup = accedi(STARTUP)
    notizia_id = crea(sessione)["notizia_id"]

    primo = allegato(sessione, notizia_id)
    assert primo.status_code == 201, primo.text
    assert primo.json()["notizia_allegato_nome_file"] == "Circolare ottobre.pdf"
    assert archivio.file[f"{cartella_notizia(notizia_id)}/Circolare ottobre.pdf"] == b"%PDF circolare"
    # Stesso nome: si aggiungono data e ora.
    secondo = allegato(sessione, notizia_id, contenuto=b"%PDF seconda")
    assert re.fullmatch(r"Circolare ottobre_\d{8}-\d{4}\.pdf", secondo.json()["notizia_allegato_nome_file"])
    # Niente cartelle nel nome.
    terzo = allegato(sessione, notizia_id, nome="..\\..\\altro/Modulo.docx", contenuto=b"modulo")
    assert terzo.json()["notizia_allegato_nome_file"] == "Modulo.docx"

    scheda = startup.get(f"/notizie/{notizia_id}").json()
    assert [a["notizia_allegato_nome_file"] for a in scheda["allegati"]][0] == "Circolare ottobre.pdf"
    scaricato = startup.get(f"/notizie/{notizia_id}/allegati/{primo.json()['notizia_allegato_id']}")
    assert scaricato.status_code == 200 and scaricato.content == b"%PDF circolare"
    assert "attachment" in scaricato.headers["content-disposition"]
    assert scaricato.headers["content-type"] == "application/pdf"

    tolto = sessione.delete(f"/notizie/{notizia_id}/allegati/{primo.json()['notizia_allegato_id']}")
    assert tolto.status_code == 204
    assert len(sessione.get(f"/notizie/{notizia_id}").json()["allegati"]) == 2
    assert f"{cartella_notizia(notizia_id)}/Circolare ottobre.pdf" in archivio.file
    assert riga(db, notizia_id)["notizia_updated_by"] == nazionale.utente_id


def test_allegato_vuoto_o_troppo_grande(db, accedi, archivio, notizie):
    _, sessione = accedi(NAZIONALE)
    notizia_id = crea(sessione)["notizia_id"]
    assert allegato(sessione, notizia_id, contenuto=b"").status_code == 422
    assert allegato(sessione, notizia_id, contenuto=b"x" * (10 * 1024 * 1024 + 1)).status_code == 413
    assert conta(db, "notizia_allegato") == 0


def test_chi_non_e_destinatario_non_scarica_gli_allegati(accedi, archivio, notizie):
    _, sessione = accedi(NAZIONALE)
    _, business = accedi(BUSINESS)
    notizia_id = crea(sessione, gruppi=["startup"])["notizia_id"]
    allegato_id = allegato(sessione, notizia_id).json()["notizia_allegato_id"]
    assert business.get(f"/notizie/{notizia_id}/allegati/{allegato_id}").status_code == 404
    assert sessione.get(f"/notizie/{notizia_id}/allegati/999").status_code == 404


# =============================================================================
# Argomenti e filtri
# =============================================================================
def sottotag_di(db, notizia_id):
    db.commit()
    return set(db.execute(text("SELECT tag_dettaglio_id FROM notizia_tag_dettaglio WHERE notizia_id = :id"),
                          {"id": notizia_id}).scalars())


def test_la_notizia_ha_gli_argomenti_della_sua_sezione(db, accedi, notizie):
    _, sessione = accedi(NAZIONALE)
    scheda = crea(sessione, sottotag=[EUROPEI, REGIONALI, EUROPEI])
    assert [s["tag_dettaglio_id"] for s in scheda["sottotag"]] == [REGIONALI, EUROPEI]
    notizia_id = scheda["notizia_id"]
    assert sottotag_di(db, notizia_id) == {REGIONALI, EUROPEI}

    # In modifica si tolgono e si aggiungono; senza argomenti va bene.
    assert sessione.put(f"/notizie/{notizia_id}", json=corpo(sottotag=[EUROPEI])).status_code == 200
    assert sottotag_di(db, notizia_id) == {EUROPEI}
    assert sessione.put(f"/notizie/{notizia_id}", json=corpo(tag_id=FORMAZIONE)).status_code == 200
    assert sottotag_di(db, notizia_id) == set()


@pytest.mark.parametrize("sottotag", [[ITALIA], [CORSI], [99]])
def test_gli_argomenti_sono_quelli_attivi_della_sezione(db, accedi, notizie, sottotag):
    _, sessione = accedi(NAZIONALE)
    assert sessione.post("/notizie/", json=corpo(sottotag=sottotag)).status_code == 422
    assert conta(db, "notizia") == 0


def test_sezioni_e_argomenti_disattivati_restano_sulla_notizia_che_li_ha(accedi, notizie):
    _, sessione = accedi(NAZIONALE)
    notizia_id = crea(sessione, sottotag=[REGIONALI])["notizia_id"]
    assert sessione.put(f"/notizie/sottotag/{REGIONALI}/stato", json={"attivo": False}).status_code == 200
    assert sessione.put(f"/notizie/tag/{BANDI}/stato", json={"attivo": False}).status_code == 200
    scheda = sessione.get(f"/notizie/{notizia_id}").json()
    assert scheda["tag_descrizione"] == "Bandi"
    assert [s["tag_dettaglio_descrizione"] for s in scheda["sottotag"]] == ["Bandi regionali"]
    # Modificando, la notizia li tiene; una notizia nuova non li puo' scegliere.
    assert sessione.put(f"/notizie/{notizia_id}", json=corpo(sottotag=[REGIONALI])).status_code == 200
    assert sessione.post("/notizie/", json=corpo()).status_code == 422
    assert sessione.post("/notizie/", json=corpo(tag_id=MONDO, sottotag=[REGIONALI])).status_code == 422


def test_l_elenco_si_filtra_per_sezione_e_argomenti(accedi, notizie):
    _, sessione = accedi(NAZIONALE)
    crea(sessione, notizia_titolo="Bandi regionali", sottotag=[REGIONALI])
    crea(sessione, notizia_titolo="Bandi europei", sottotag=[EUROPEI])
    crea(sessione, notizia_titolo="Mondo", tag_id=MONDO)

    def titoli(query):
        return [n["notizia_titolo"] for n in sessione.get(f"/notizie/?{query}").json()]

    assert titoli(f"tag_id={BANDI}") == ["Bandi europei", "Bandi regionali"]
    assert titoli(f"tag_id={BANDI}&tag_dettaglio_id={REGIONALI}") == ["Bandi regionali"]
    # Piu' argomenti: le notizie con almeno uno, ciascuna una volta sola.
    crea(sessione, notizia_titolo="Tutti e due", sottotag=[REGIONALI, EUROPEI])
    entrambi = f"tag_id={BANDI}&tag_dettaglio_id={REGIONALI}&tag_dettaglio_id={EUROPEI}"
    assert titoli(entrambi) == ["Tutti e due", "Bandi europei", "Bandi regionali"]
    assert sessione.get("/notizie/?tag_dettaglio_id=0").status_code == 422
    assert titoli(f"tag_id={MONDO}") == ["Mondo"]
    assert titoli("limit=20") == ["Tutti e due", "Mondo", "Bandi europei", "Bandi regionali"]
    terza = sessione.get("/notizie/?limit=4").json()[2]
    assert terza["sottotag"] == [{"tag_dettaglio_id": EUROPEI, "tag_dettaglio_descrizione": "Bandi europei"}]


# =============================================================================
# Gestione di sezioni e argomenti
# =============================================================================
def test_il_nazionale_aggiunge_sezioni_e_argomenti(accedi, notizie):
    _, sessione = accedi(NAZIONALE)
    risposta = sessione.post("/notizie/tag", json={"nome": "  Lavoro   e  scuola "})
    assert risposta.status_code == 201, risposta.text
    nuovo = next(t for t in risposta.json() if t["tag_descrizione"] == "Lavoro e scuola")
    assert nuovo["attivo"] is True and nuovo["sottotag"] == []

    risposta = sessione.post(f"/notizie/tag/{nuovo['tag_id']}/sottotag", json={"nome": "Scuole superiori"})
    assert risposta.status_code == 201, risposta.text
    sotto = next(t for t in risposta.json() if t["tag_id"] == nuovo["tag_id"])["sottotag"][0]
    assert sotto["tag_dettaglio_descrizione"] == "Scuole superiori" and sotto["attivo"] is True
    # La nuova sezione si sceglie subito, con il suo argomento.
    scheda = crea(sessione, tag_id=nuovo["tag_id"], sottotag=[sotto["tag_dettaglio_id"]])
    assert scheda["tag_descrizione"] == "Lavoro e scuola"


def test_nomi_doppi_e_vuoti_si_rifiutano(accedi, notizie):
    _, sessione = accedi(NAZIONALE)
    assert sessione.post("/notizie/tag", json={"nome": "mondo"}).status_code == 409
    assert sessione.post("/notizie/tag", json={"nome": "   "}).status_code == 422
    assert sessione.post(f"/notizie/tag/{BANDI}/sottotag", json={"nome": "BANDI EUROPEI"}).status_code == 409
    # Lo stesso nome sotto un'altra sezione va bene.
    assert sessione.post(f"/notizie/tag/{MONDO}/sottotag", json={"nome": "Bandi europei"}).status_code == 201
    assert sessione.post("/notizie/tag/99/sottotag", json={"nome": "X"}).status_code == 404


def test_disattivare_e_riattivare(db, accedi, notizie):
    _, sessione = accedi(NAZIONALE)
    elenco = sessione.put(f"/notizie/tag/{MONDO}/stato", json={"attivo": False}).json()
    assert next(t for t in elenco if t["tag_id"] == MONDO)["attivo"] is False
    assert MONDO not in [t["tag_id"] for t in sessione.get("/notizie/categorie").json()]
    sessione.put(f"/notizie/tag/{MONDO}/stato", json={"attivo": True})
    sessione.put(f"/notizie/sottotag/{CORSI}/stato", json={"attivo": True})
    scelte = {t["tag_id"]: t for t in sessione.get("/notizie/categorie").json()}
    assert MONDO in scelte
    assert [s["tag_dettaglio_id"] for s in scelte[FORMAZIONE]["sottotag"]] == [CORSI]
    tutti = sessione.get("/notizie/tag").json()
    assert [t["tag_id"] for t in tutti] == [1, 2, 3, 4] and tutti[3]["attivo"] is False
    assert conta(db, "tag") == 4  # niente si cancella


def test_solo_il_nazionale_gestisce_sezioni_e_argomenti(db, accedi, notizie):
    _, business = accedi(BUSINESS)
    assert business.get("/notizie/tag").status_code == 403
    assert business.post("/notizie/tag", json={"nome": "Nuovo"}).status_code == 403
    assert business.post(f"/notizie/tag/{MONDO}/sottotag", json={"nome": "Nuovo"}).status_code == 403
    assert business.put(f"/notizie/tag/{MONDO}/stato", json={"attivo": False}).status_code == 403
    assert business.put(f"/notizie/sottotag/{REGIONALI}/stato", json={"attivo": False}).status_code == 403
    db.commit()
    assert db.execute(text("SELECT COUNT(*) FROM tag WHERE tag_attivoSN = -1")).scalar_one() == 3


# =============================================================================
# Notizie lette
# =============================================================================
def da_leggere(browser):
    risposta = browser.get("/notizie/da-leggere")
    assert risposta.status_code == 200, risposta.text
    return risposta.json()["totale"]


def lette(browser):
    return {n["notizia_titolo"]: n["letta"] for n in browser.get("/notizie/").json()}


def letture(db, notizia_id):
    db.commit()
    return db.execute(text("SELECT utente_id FROM notizia_letta WHERE notizia_id = :id ORDER BY utente_id"),
                      {"id": notizia_id}).scalars().all()


def test_aprire_la_scheda_segna_la_notizia_letta(db, accedi, notizie):
    _, nazionale = accedi(NAZIONALE)
    persona, sessione = accedi(STARTUP)
    prima = crea(nazionale, notizia_titolo="Prima")
    crea(nazionale, notizia_titolo="Seconda")
    assert lette(sessione) == {"Prima": False, "Seconda": False}
    assert da_leggere(sessione) == 2

    assert sessione.get(f"/notizie/{prima['notizia_id']}").status_code == 200
    assert lette(sessione) == {"Prima": True, "Seconda": False}
    assert da_leggere(sessione) == 1

    # Riaprirla non aggiunge righe.
    sessione.get(f"/notizie/{prima['notizia_id']}")
    assert letture(db, prima["notizia_id"]) == [persona.utente_id]


def test_si_contano_solo_le_notizie_di_cui_si_e_destinatari(db, accedi, notizie):
    _, nazionale = accedi(NAZIONALE)
    _, business = accedi(BUSINESS)
    per_startup = crea(nazionale, notizia_titolo="Alle startup", gruppi=["startup"])
    crea(nazionale, notizia_titolo="A tutti")
    assert da_leggere(business) == 1
    # Una notizia che non vede non si apre e non si segna.
    assert business.get(f"/notizie/{per_startup['notizia_id']}").status_code == 404
    assert letture(db, per_startup["notizia_id"]) == []


def test_per_il_nazionale_contano_tutte_le_notizie(db, accedi, notizie):
    nazionale, sessione = accedi(NAZIONALE)
    _, startup = accedi(STARTUP)
    notizia = crea(sessione, notizia_titolo="Alle startup", gruppi=["startup"])
    crea(sessione, notizia_titolo="Ai business", gruppi=["business"])
    assert da_leggere(sessione) == 2
    assert lette(sessione) == {"Alle startup": False, "Ai business": False}

    sessione.get(f"/notizie/{notizia['notizia_id']}")
    assert da_leggere(sessione) == 1
    assert letture(db, notizia["notizia_id"]) == [nazionale.utente_id]
    # Le letture sono di ciascuno: per la startup resta da leggere.
    assert da_leggere(startup) == 1


def test_modificata_resta_letta(accedi, notizie):
    _, nazionale = accedi(NAZIONALE)
    _, startup = accedi(STARTUP)
    notizia = crea(nazionale, notizia_titolo="Prima versione")
    startup.get(f"/notizie/{notizia['notizia_id']}")
    assert nazionale.put(f"/notizie/{notizia['notizia_id']}",
                         json=corpo(notizia_titolo="Seconda versione")).status_code == 200
    assert lette(startup) == {"Seconda versione": True}
    assert da_leggere(startup) == 0
