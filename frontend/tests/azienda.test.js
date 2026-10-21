import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  CENTRO_VUOTO, cercaCentroPartitaIva, datiCentro, modificheCentro, nominativoAttuatore, partitaIvaCompleta,
  pivaNonConforme, salvaCentro,
} from "../src/lib/azienda.js";
import { CAMPI_ANAGRAFICI, CAMPI_AZIENDA } from "../src/config/campiAzienda.js";
import { pulisciSessione, salvaSessione } from "../src/lib/sessione.js";

const richieste = [];
const risposte = [];
const json = (dati, status = 200) => new Response(JSON.stringify(dati), { status });

beforeEach(() => {
  globalThis.window = { location: { origin: "http://localhost:5180", pathname: "/centri/1", search: "", hash: "",
    replace: () => {} } };
  richieste.length = risposte.length = 0;
  pulisciSessione();
  globalThis.fetch = async (url, opzioni) => {
    richieste.push({ url, ...opzioni });
    const r = risposte.shift();
    assert.ok(r, "richiesta inattesa");
    return r;
  };
});

const SCHEDA = {
  azienda_id: 1, azienda_ragione_sociale: "Centro Nord", azienda_partitaIVA: "01234567890",
  azienda_codiceFiscale: "01234567890", azienda_codice_nazionale: "EQ-0001", azienda_via: "Via Roma",
  azienda_civico: null, azienda_citta: "Milano", azienda_CAP: "20100", azienda_provincia: "MI", azienda_iban: null,
  attuatori: [], permessi: { anagrafici: false },
};

test("il modulo legge la scheda: tutti i campi, null diventa vuoto", () => {
  const dati = datiCentro(SCHEDA);
  assert.deepEqual(Object.keys(dati), [...CAMPI_AZIENDA, "azienda_padre_id", "padre_nome"]);
  assert.deepEqual(Object.keys(CENTRO_VUOTO), CAMPI_AZIENDA);
  assert.equal(dati.azienda_civico, "");
  assert.equal(dati.azienda_codice_nazionale, "EQ-0001");
});

test("si mandano solo i campi cambiati; codice nazionale mai, anagrafici solo col permesso", () => {
  const salvati = datiCentro(SCHEDA);
  assert.deepEqual(modificheCentro(salvati, salvati), {});
  const dati = { ...salvati, azienda_civico: "12", azienda_ragione_sociale: "Altro", azienda_codice_nazionale: "X" };
  assert.deepEqual(modificheCentro(dati, salvati, { anagrafici: false }), { azienda_civico: "12" });
  assert.deepEqual(modificheCentro(dati, salvati, { anagrafici: true }),
    { azienda_ragione_sociale: "Altro", azienda_civico: "12" });
  assert.ok(CAMPI_ANAGRAFICI.every((campo) => CAMPI_AZIENDA.includes(campo)));
});

test("partita IVA: avviso solo se scritta e diversa da 11 cifre", () => {
  assert.equal(pivaNonConforme(""), false);
  assert.equal(pivaNonConforme("01234567890"), false);
  assert.equal(pivaNonConforme("0123456789"), true);
  assert.equal(pivaNonConforme("0123456789A"), true);
});

test("centro superiore: resta nel modulo e si invia solo con il permesso di gerarchia", () => {
  const salvati = datiCentro({ ...SCHEDA, azienda_padre_id: 9, padre_nome: "Centro principale" });
  assert.equal(salvati.padre_nome, "Centro principale");
  const rimossi = { ...salvati, azienda_padre_id: null, padre_nome: null };
  assert.deepEqual(modificheCentro(rimossi, salvati, { gerarchia: false }), {});
  assert.deepEqual(modificheCentro(rimossi, salvati, { gerarchia: true }), { azienda_padre_id: null });
  assert.deepEqual(modificheCentro({ ...salvati, azienda_civico: "8" }, salvati, { gerarchia: true }),
    { azienda_civico: "8" });
});

test("nominativo degli attuatori per cognome", () => {
  assert.equal(nominativoAttuatore({ cliente_nome: "Mario", cliente_cognome: "Rossi" }), "Rossi Mario");
  assert.equal(nominativoAttuatore({ cliente_nome: "", cliente_cognome: "" }), "—");
});

test("salvataggio: PUT delle sole modifiche, errore del server come messaggio", async () => {
  salvaSessione({ utente_id: 1, ruolo_codice: "business", csrf_token: "a".repeat(64) });
  risposte.push(json({ detail: "Solo il Nazionale può modificare i dati anagrafici del centro." }, 403));
  await assert.rejects(salvaCentro(1, { azienda_ragione_sociale: "Altro" }), {
    message: "Solo il Nazionale può modificare i dati anagrafici del centro.", stato: 403,
  });
  const [put] = richieste;
  assert.ok(put.url.endsWith("/aziende/1"));
  assert.equal(put.method, "PUT");
  assert.deepEqual(JSON.parse(put.body), { azienda_ragione_sociale: "Altro" });
});

test("ricerca del centro per partita IVA: solo 11 cifre, 404 come messaggio", async () => {
  assert.equal(partitaIvaCompleta("01234567890"), true);
  for (const valore of ["", "0123456789", "0123456789a", null]) assert.equal(partitaIvaCompleta(valore), false);

  risposte.push(json({ azienda_id: 1, azienda_ragione_sociale: "Centro Nord" }),
    json({ detail: "Nessun centro trovato con questa partita IVA." }, 404));
  assert.deepEqual(await cercaCentroPartitaIva("01234567890"), { azienda_id: 1, azienda_ragione_sociale: "Centro Nord" });
  await assert.rejects(cercaCentroPartitaIva("09876543210"), {
    message: "Nessun centro trovato con questa partita IVA.", stato: 404,
  });
  assert.ok(richieste[0].url.endsWith("/aziende/partita-iva/01234567890"));
});
