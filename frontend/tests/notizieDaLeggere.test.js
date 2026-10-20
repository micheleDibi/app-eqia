import { afterEach, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setImmediate } from "node:timers";
import { API_BASE_URL } from "../src/lib/api.js";
import { ErroreApi } from "../src/lib/erroriApi.js";
import {
  aggiornaNotizieDaLeggere,
  archivioNotizieDaLeggere,
  creaArchivioNotizieDaLeggere,
  etichettaContatore,
  leggiNotizieDaLeggere,
} from "../src/lib/notizieDaLeggere.js";
import { TESTI_NOTIZIE_DA_LEGGERE as testi } from "../src/config/testi/notizie.js";
import { STILI_NOTIZIE } from "../src/config/styles/notizie.js";

const INTERVALLO = 1000;
const attendi = () => new Promise((risolvi) => setImmediate(risolvi));

function crea({ esiti = [], ruoloCodice = "startup", sessione, documento } = {}) {
  const chiamate = [];
  const osservatori = new Set();
  let attuale = sessione === undefined ? { utenteId: 7, ruoloCodice } : sessione;
  const archivio = creaArchivioNotizieDaLeggere({
    leggi: (opzioni) => {
      chiamate.push(opzioni);
      return Promise.resolve(esiti.shift() ?? { totale: 0 });
    },
    intervalloMs: INTERVALLO,
    documento,
    leggiSessione: () => attuale,
    osservaSessione: (osservatore) => { osservatori.add(osservatore); return () => osservatori.delete(osservatore); },
  });
  const cambiaSessione = (nuova) => { attuale = nuova; osservatori.forEach((o) => o()); };
  return { archivio, chiamate, cambiaSessione };
}

beforeEach(() => mock.timers.enable({ apis: ["setInterval"] }));
afterEach(() => mock.timers.reset());

test("l'archivio tiene il solo totale delle notizie e lo rilegge a intervalli", async () => {
  const { archivio, chiamate } = crea({ esiti: [{ totale: 3 }, { totale: 2, altro: 9 }] });
  assert.deepEqual(archivio.snapshot(), { totale: 0, versione: 0 });
  const smetti = archivio.subscribe(() => {});
  await attendi();
  assert.deepEqual(archivio.snapshot(), { totale: 3, versione: 1 });
  mock.timers.tick(INTERVALLO);
  await attendi();
  assert.equal(chiamate.length, 2);
  assert.deepEqual(archivio.snapshot(), { totale: 2, versione: 2 });
  smetti();
  mock.timers.tick(INTERVALLO);
  await attendi();
  assert.equal(chiamate.length, 2, "senza iscritti il poll si ferma");
});

test("un totale non valido conta zero, e uguale non cambia lo snapshot", async () => {
  const { archivio } = crea({ esiti: [{ totale: 4 }, { totale: 4 }, { totale: -1 }] });
  await archivio.aggiorna();
  const primo = archivio.snapshot();
  await archivio.aggiorna();
  assert.equal(archivio.snapshot(), primo);
  await archivio.aggiorna();
  assert.deepEqual(archivio.snapshot(), { totale: 0, versione: 2 });
});

test("tutti i ruoli Equia, Nazionale compreso, interrogano il server", async () => {
  for (const ruoloCodice of ["nazionale", "business", "startup", "startup-for-education"]) {
    const { archivio, chiamate } = crea({ ruoloCodice, esiti: [{ totale: 1 }] });
    await archivio.aggiorna();
    assert.equal(chiamate.length, 1, ruoloCodice);
    assert.equal(archivio.snapshot().totale, 1, ruoloCodice);
  }
});

test("un ruolo senza la voce Notizie, o nessuna sessione, non interroga il server", async () => {
  for (const sessione of [{ utenteId: 7, ruoloCodice: "sconosciuto" }, null]) {
    const { archivio, chiamate } = crea({ sessione });
    await archivio.aggiorna();
    assert.equal(chiamate.length, 0);
    assert.deepEqual(archivio.snapshot(), { totale: 0, versione: 0 });
  }
});

test("cambiando utente il totale riparte da zero e si rilegge", async () => {
  const { archivio, chiamate, cambiaSessione } = crea({ esiti: [{ totale: 5 }, { totale: 1 }] });
  const smetti = archivio.subscribe(() => {});
  await attendi();
  assert.equal(archivio.snapshot().totale, 5);
  cambiaSessione({ utenteId: 8, ruoloCodice: "business" });
  await attendi();
  assert.equal(chiamate.length, 2);
  assert.equal(archivio.snapshot().totale, 1);
  cambiaSessione(null);
  assert.equal(archivio.snapshot().totale, 0);
  smetti();
});

test("con la scheda del browser nascosta il poll si sospende", async () => {
  const ascoltatori = {};
  const documento = { visibilityState: "visible", addEventListener: (nome, f) => { ascoltatori[nome] = f; },
    removeEventListener: () => {} };
  const { archivio, chiamate } = crea({ documento });
  const smetti = archivio.subscribe(() => {});
  await attendi();
  documento.visibilityState = "hidden";
  ascoltatori.visibilitychange();
  mock.timers.tick(INTERVALLO * 3);
  await attendi();
  assert.equal(chiamate.length, 1);
  documento.visibilityState = "visible";
  ascoltatori.visibilitychange();
  await attendi();
  assert.equal(chiamate.length, 2);
  smetti();
});

test("leggiNotizieDaLeggere: indirizzo, no-store e segnale", async () => {
  const fetchOriginale = globalThis.fetch;
  const richieste = [];
  globalThis.fetch = async (url, opzioni) => {
    richieste.push({ url, ...opzioni });
    return new Response(JSON.stringify({ totale: 5 }), { status: 200 });
  };
  try {
    const controllore = new AbortController();
    assert.deepEqual(await leggiNotizieDaLeggere({ signal: controllore.signal }), { totale: 5 });
    assert.equal(richieste[0].url, `${API_BASE_URL}/notizie/da-leggere`);
    assert.equal(richieste[0].cache, "no-store");
    assert.equal(richieste[0].signal, controllore.signal);
  } finally {
    globalThis.fetch = fetchOriginale;
  }
});

test("leggiNotizieDaLeggere: una risposta non ok solleva un errore", async () => {
  const fetchOriginale = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: "Errore" }), { status: 500 });
  try {
    await assert.rejects(leggiNotizieDaLeggere(), (errore) => errore instanceof ErroreApi && errore.stato === 500);
  } finally {
    globalThis.fetch = fetchOriginale;
  }
});

test("istanza predefinita: unica, e senza sessione non chiede nulla", async () => {
  const fetchOriginale = globalThis.fetch;
  globalThis.fetch = async () => assert.fail("richiesta HTTP inattesa");
  try {
    const archivio = archivioNotizieDaLeggere();
    assert.equal(archivioNotizieDaLeggere(), archivio);
    await aggiornaNotizieDaLeggere();
    assert.deepEqual(archivio.snapshot(), { totale: 0, versione: 0 });
  } finally {
    globalThis.fetch = fetchOriginale;
  }
});

test("contatore e nome accessibile della voce del menu, invariati con zero", () => {
  assert.equal(etichettaContatore(0), "");
  assert.equal(etichettaContatore(undefined), "");
  assert.equal(etichettaContatore(7), "7");
  assert.equal(etichettaContatore(150), "99+");
  assert.equal(testi.voceMenu("Notizie", 0), "Notizie");
  assert.equal(testi.voceMenu("Notizie", 1), "Notizie, 1 notizia da leggere");
  assert.equal(testi.voceMenu("Notizie", 4), "Notizie, 4 notizie da leggere");
});

test("il pallino della notizia e' rosso e tondo", () => {
  const classi = new Set(STILI_NOTIZIE.pallinoDaLeggere.split(/\s+/));
  for (const classe of ["inline-block", "size-2.5", "rounded-full", "bg-negativo"]) assert.ok(classi.has(classe), classe);
});

// Sorgenti letti come testo (i test non importano .jsx).
test("pallino nell'elenco e nel riquadro, solo per le notizie con letta falso", () => {
  const pallino = readFileSync(new URL("../src/components/notizie/PallinoDaLeggere.jsx", import.meta.url), "utf8");
  assert.match(pallino, /if \(notizia\.letta !== false\) return null;/);
  for (const file of ["PaginaNotizie.jsx", "RiquadroNotizie.jsx"]) {
    const codice = readFileSync(new URL(`../src/components/notizie/${file}`, import.meta.url), "utf8");
    assert.match(codice, /<PallinoDaLeggere notizia=\{notizia\} \/>\{notizia\.notizia_titolo\}/, file);
  }
});

test("menu e scheda: contatore sulla voce Notizie e rilettura dopo l'apertura", () => {
  const menu = readFileSync(new URL("../src/components/shell/MenuNavigazione.jsx", import.meta.url), "utf8");
  assert.match(menu, /const contatore = rotta === ROTTE\.notizie \? contatoreNotizie : "";/);
  const scheda = readFileSync(new URL("../src/components/notizie/SchedaNotizia.jsx", import.meta.url), "utf8");
  assert.match(scheda, /setStato\(\{ scheda, loading: false, errore: null \}\);\s*\/\/[^\n]*\n\s*aggiornaNotizieDaLeggere\(\);/);
});
