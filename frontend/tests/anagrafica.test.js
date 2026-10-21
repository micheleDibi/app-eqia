import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  ANAGRAFICA_VUOTA, cambiaCentroAttuatore, copiaResidenza, dataCronologia, datiModulo, leggiPadri, modificheAnagrafica, nomeRuoloId,
  opzioniRuolo, padreScelto, rotteTipo, salvaAnagrafica, schedaAttiva, schedeAnagrafica,
} from "../src/lib/anagrafica.js";
import { pulisciSessione, salvaSessione } from "../src/lib/sessione.js";

const richieste = [];
const risposte = [];
const json = (dati, status = 200) => new Response(JSON.stringify(dati), { status });

beforeEach(() => {
  globalThis.window = { location: { origin: "http://localhost:5180", pathname: "/attuatori/7", search: "", hash: "",
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
  cliente_id: 7, tipo: "attuatore", cliente_ruolo: 1, cliente_nome: "Mario", cliente_cognome: "Rossi",
  cliente_codice_fiscale: null, cliente_cellulare: null, cliente_email: "mario@example.org",
  cliente_dataNascita: "1985-12-10", cliente_indirizzo: "Via Roma", cliente_civico: "1", cliente_citta: "Milano",
  cliente_CAP: "20100", cliente_provincia: "MI",
};

test("il modulo legge la scheda: null diventa vuoto, il ruolo diventa testo", () => {
  const dati = datiModulo(SCHEDA);
  assert.equal(dati.nome, "Mario");
  assert.equal(dati.codiceFiscale, "");
  assert.equal(dati.cellulare, "");
  assert.equal(dati.dataDiNascita, "1985-12-10");
  assert.equal(dati.ruolo, "1");
  assert.deepEqual(Object.keys(dati).sort(), Object.keys(ANAGRAFICA_VUOTA).sort());
  assert.equal(datiModulo({ ...SCHEDA, cliente_ruolo: null }).ruolo, "");
});

test("si mandano solo le colonne cambiate; una data svuotata vale null", () => {
  const salvati = datiModulo(SCHEDA);
  assert.deepEqual(modificheAnagrafica(salvati, salvati), {});
  const dati = { ...salvati, nome: "Maria", cellulare: "3331234567", dataDiNascita: "", ruolo: "3" };
  assert.deepEqual(modificheAnagrafica(dati, salvati), {
    cliente_nome: "Maria", cliente_cellulare: "3331234567", cliente_dataNascita: null, cliente_ruolo: 3,
  });
});

test("nome utente e padre: letti dall'account, mandati solo se cambiati", () => {
  const scheda = { ...SCHEDA, account: { username: "MarioRossi", padre: { utente_id: 4, nome: "Bruno Bianchi" } } };
  const salvati = datiModulo(scheda);
  assert.equal(salvati.username, "MarioRossi");
  assert.deepEqual(salvati.padre, { utente_id: 4, nome: "Bruno Bianchi" });
  assert.deepEqual(modificheAnagrafica({ ...salvati, padre: { utente_id: 4, nome: "Bruno Bianchi" } }, salvati), {});
  const nuovo = padreScelto({ utente_id: 9, cliente_nome: "Marta", cliente_cognome: "Colombo" });
  assert.deepEqual(nuovo, { utente_id: 9, nome: "Marta Colombo" });
  assert.deepEqual(modificheAnagrafica({ ...salvati, username: "MRossi", padre: nuovo }, salvati),
    { utente_username: "MRossi", utente_padre: 9 });
});

test("attuatori fra cui scegliere il padre: ricerca, ruolo e pagina nell'indirizzo", async () => {
  risposte.push(json({ voci: [], altri: false }));
  assert.deepEqual(await leggiPadri(7, { cerca: "rossi nord", ruolo: "2", dopo: 50 }), { voci: [], altri: false });
  const indirizzo = new URL(richieste[0].url, "http://localhost");
  assert.ok(indirizzo.pathname.endsWith("/clienti/7/padri"));
  assert.deepEqual(Object.fromEntries(indirizzo.searchParams), { cerca: "rossi nord", dopo: "50", ruolo: "2" });
});

test("copia da residenza: i cinque campi del domicilio, il resto invariato", () => {
  const copiato = copiaResidenza({ ...datiModulo(SCHEDA), domicilioComune: "Roma" });
  assert.deepEqual(
    [copiato.domicilioIndirizzo, copiato.domicilioCivico, copiato.domicilioComune, copiato.domicilioCap,
      copiato.domicilioProvincia],
    ["Via Roma", "1", "Milano", "20100", "MI"],
  );
  assert.equal(copiato.residenzaComune, "Milano");
});

test("il Centro e' una scheda solo degli attuatori; una scheda ignota ripiega sulla prima", () => {
  assert.deepEqual(schedeAnagrafica("attuatore"), ["dati-principali", "centro", "utente"]);
  assert.deepEqual(schedeAnagrafica("sottoscrittore"), ["dati-principali", "utente"]);
  assert.equal(schedaAttiva("sottoscrittore", "centro"), "dati-principali");
  assert.equal(schedaAttiva("attuatore", "centro"), "centro");
  assert.equal(schedaAttiva("attuatore", "esami"), "dati-principali");
});

test("ruoli dal catalogo; il sottoscrittore e' l'opzione senza ruolo di accesso", () => {
  const sottoscrittore = ["", "Nessuno (senza accesso)"];
  assert.deepEqual(opzioniRuolo([null, 1, 3]), [sottoscrittore, ["1", "Startup"], ["3", "Startup for Education"]]);
  // "Ruolo attuatore" senza il sottoscrittore, salvo che sia la scelta a video.
  assert.deepEqual(opzioniRuolo([null, 1, 3], { soloAttuatori: true, valore: "1" }),
    [["1", "Startup"], ["3", "Startup for Education"]]);
  assert.deepEqual(opzioniRuolo([null, 1], { soloAttuatori: true, valore: "" }), [sottoscrittore, ["1", "Startup"]]);
  assert.equal(nomeRuoloId("3"), "Startup for Education");
  assert.equal(nomeRuoloId(""), "Nessuno (senza accesso)");
  assert.equal(nomeRuoloId(null), "Nessuno (senza accesso)");
  assert.equal(rotteTipo("attuatore").dettaglio(7), "/attuatori/7");
  assert.equal(rotteTipo("sottoscrittore").dettaglio(7), "/sottoscrittori/7");
});

test("cronologia: un giorno senza ora resta quel giorno", () => {
  assert.equal(dataCronologia("2026-10-21"), "21/10/2026");
  assert.equal(dataCronologia(null), "");
  assert.match(dataCronologia("2026-10-21T10:30:00"), /^21\/10\/2026, 10:30:00$/);
});

test("salvataggio: PUT delle sole modifiche, errore del server come messaggio", async () => {
  salvaSessione({ utente_id: 1, ruolo_codice: "nazionale", csrf_token: "a".repeat(64) });
  risposte.push(json({ detail: "Codice fiscale non valido: formato non conforme." }, 422));
  await assert.rejects(salvaAnagrafica(7, { cliente_codice_fiscale: "X" }), {
    message: "Codice fiscale non valido: formato non conforme.", stato: 422,
  });
  const [put] = richieste;
  assert.ok(put.url.endsWith("/clienti/7"));
  assert.equal(put.method, "PUT");
  assert.equal(put.headers["X-CSRF-Token"], "a".repeat(64));
  assert.deepEqual(JSON.parse(put.body), { cliente_codice_fiscale: "X" });
});

test("centro dell'attuatore: PUT dell'id, null per togliere l'associazione", async () => {
  salvaSessione({ utente_id: 1, ruolo_codice: "business", csrf_token: "a".repeat(64) });
  risposte.push(json({ ...SCHEDA, centro: null }), json({ detail: "Non puoi assegnare questo centro." }, 403));
  assert.equal((await cambiaCentroAttuatore(7, null)).centro, null);
  await assert.rejects(cambiaCentroAttuatore(7, 4), { message: "Non puoi assegnare questo centro.", stato: 403 });
  const [togli, associa] = richieste;
  assert.ok(togli.url.endsWith("/clienti/7/centro"));
  assert.equal(togli.method, "PUT");
  assert.deepEqual(JSON.parse(togli.body), { azienda_id: null });
  assert.deepEqual(JSON.parse(associa.body), { azienda_id: 4 });
});
