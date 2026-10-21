import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { caricaProfilo, nomeProfilo, sezioniProfilo } from "../src/lib/profilo.js";
import {
  attivaAuthenticator, caricaStatoMfa, confermaAuthenticator, confermaPasskey, dataAttivazione,
  disattivaAuthenticator, opzioniPasskey, rimuoviPasskey,
} from "../src/lib/sicurezza.js";
import { TESTI_PROFILO } from "../src/config/testi/profilo.js";
import { TESTI_SICUREZZA } from "../src/config/testi/sicurezza.js";
import { leggiSessione, pulisciSessione, salvaSessione } from "../src/lib/sessione.js";

const CSRF = "d".repeat(64);
const SESSIONE = { utente_id: 1, ruolo_codice: "nazionale", csrf_token: CSRF };
const INDIRIZZO = { indirizzo: "Via Roma", civico: "1", citta: "Milano", cap: "20100", provincia: "MI" };
const PROFILO = { username: "nazionale", nome: " Giulia ", cognome: "Rossi", email: "giulia.rossi@example.org",
  pec: "", residenza: INDIRIZZO, domicilio: {} };
const richieste = [];
const risposte = [];
const reindirizzamenti = [];
const json = (dati, status = 200, headers = {}) => new Response(JSON.stringify(dati), { status, headers });

function deposito() {
  const valori = new Map();
  return { getItem: (k) => valori.get(k) ?? null, setItem: (k, v) => valori.set(k, String(v)),
    removeItem: (k) => valori.delete(k) };
}

beforeEach(() => {
  globalThis.window = { location: { origin: "http://localhost:5180", pathname: "/profilo", search: "", hash: "",
    replace: (url) => reindirizzamenti.push(url) }, sessionStorage: deposito() };
  richieste.length = risposte.length = reindirizzamenti.length = 0;
  pulisciSessione();
  globalThis.fetch = async (url, opzioni) => {
    richieste.push({ url, ...opzioni });
    const r = risposte.shift();
    assert.ok(r, "richiesta inattesa");
    return r;
  };
});

test("nome mostrato: nome e cognome, poi username, poi una dicitura generica", () => {
  assert.equal(nomeProfilo(PROFILO), "Giulia Rossi");
  assert.equal(nomeProfilo({ nome: " ", cognome: "", username: " nazionale " }), "nazionale");
  assert.equal(nomeProfilo({ nome: 3, username: null }), TESTI_PROFILO.account);
  assert.equal(nomeProfilo(null), TESTI_PROFILO.account);
});

test("sezioni del profilo: campi vuoti o mancanti come 'Non indicato'", () => {
  const sezioni = sezioniProfilo(PROFILO);
  assert.deepEqual(sezioni.map((s) => s.id), ["anagrafica", "contatti", "residenza", "domicilio"]);
  const valore = (sezione, chiave) => sezioni.find((s) => s.id === sezione).campi.find((c) => c.chiave === chiave).valore;
  assert.equal(valore("anagrafica", "nome"), "Giulia");
  assert.equal(valore("anagrafica", "codice_fiscale"), TESTI_PROFILO.nonIndicato);
  assert.equal(valore("contatti", "pec"), TESTI_PROFILO.nonIndicato);
  assert.equal(valore("residenza", "citta"), "Milano");
  assert.equal(valore("domicilio", "citta"), TESTI_PROFILO.nonIndicato);
  assert.deepEqual(sezioni.find((s) => s.id === "residenza").campi.map((c) => c.etichetta),
    ["Indirizzo", "Numero civico", "Comune", "CAP", "Provincia"]);
});

test("caricamento del profilo: sola lettura, senza CSRF e senza cache", async () => {
  salvaSessione(SESSIONE);
  risposte.push(json(PROFILO));
  assert.deepEqual(await caricaProfilo(), PROFILO);
  assert.equal(richieste[0].url, "/api/profilo/me");
  assert.equal(richieste[0].method, undefined);
  assert.equal(richieste[0].cache, "no-store");
  assert.equal(richieste[0].headers["X-CSRF-Token"], undefined);
});

test("profilo incompleto o server non disponibile: errore leggibile", async () => {
  risposte.push(json({ ...PROFILO, domicilio: undefined }), json({ username: 5, residenza: {}, domicilio: {} }), json(null));
  for (let i = 0; i < 3; i += 1) await assert.rejects(caricaProfilo(), { message: TESTI_PROFILO.errore });
  risposte.push(json(null, 502));
  await assert.rejects(caricaProfilo(), { message: "Servizio temporaneamente non disponibile. Riprova tra poco.",
    stato: 502 });
});

test("profilo a sessione scaduta: rinvio all'accesso e ritorno al profilo dopo", async () => {
  salvaSessione(SESSIONE);
  risposte.push(json({}, 401));
  await assert.rejects(caricaProfilo(), { stato: 401 });
  assert.equal(leggiSessione(), null);
  assert.deepEqual(reindirizzamenti, ["/?sessione=scaduta"]);
  assert.equal(window.sessionStorage.getItem("eqia_ritorno_accesso"), "/profilo");
});

test("stato dei metodi: lettura senza CSRF", async () => {
  salvaSessione(SESSIONE);
  const stato = { totp: { attivo: false }, passkey: [] };
  risposte.push(json(stato));
  assert.deepEqual(await caricaStatoMfa(), stato);
  assert.equal(richieste[0].url, "/api/auth/mfa");
  assert.equal(richieste[0].cache, "no-store");
  assert.equal(richieste[0].headers["X-CSRF-Token"], undefined);
  risposte.push(json(null, 400));
  await assert.rejects(caricaStatoMfa(), { message: TESTI_SICUREZZA.erroreStato });
});

test("gestione dei metodi: indirizzo, corpo e CSRF di ogni operazione", async () => {
  salvaSessione(SESSIONE);
  const casi = [
    [() => attivaAuthenticator("pw"), "/auth/mfa/totp/attiva", { password: "pw" }],
    [() => confermaAuthenticator("123456"), "/auth/mfa/totp/conferma", { codice: "123456" }],
    [() => disattivaAuthenticator("pw", "123456"), "/auth/mfa/totp/disattiva", { password: "pw", codice: "123456" }],
    [() => opzioniPasskey("pw"), "/auth/mfa/passkey/opzioni", { password: "pw" }],
    [() => confermaPasskey("s-1", { id: "c" }, "Telefono"), "/auth/mfa/passkey/conferma",
      { sfida: "s-1", credenziale: { id: "c" }, nome: "Telefono" }],
    [() => rimuoviPasskey("pw", 4), "/auth/mfa/passkey/rimuovi", { password: "pw", id: 4 }],
  ];
  for (const [chiamata, percorso, atteso] of casi) {
    risposte.push(json({ ok: true }));
    assert.deepEqual(await chiamata(), { ok: true });
    const r = richieste.at(-1);
    assert.equal(r.url, `/api${percorso}`);
    assert.equal(r.method, "POST");
    assert.equal(r.headers["X-CSRF-Token"], CSRF);
    assert.deepEqual(JSON.parse(r.body), atteso);
  }
});

test("gestione dei metodi: messaggio del server, ripiego specifico e attesa", async () => {
  salvaSessione(SESSIONE);
  risposte.push(json({ detail: "Password non corretta." }, 400));
  await assert.rejects(attivaAuthenticator("sbagliata"), { message: "Password non corretta.", stato: 400 });
  risposte.push(json(null, 400));
  await assert.rejects(rimuoviPasskey("pw", 4), { message: "Rimozione non riuscita. Riprova." });
  risposte.push(json({}, 429, { "Retry-After": "45" }));
  await assert.rejects(disattivaAuthenticator("pw", "000000"), { stato: 429, attesaSecondi: 45 });
  risposte.push(json({}, 403));
  await assert.rejects(opzioniPasskey("pw"), { message: "Avvio della registrazione non riuscito. Riprova.", stato: 403 });
});

test("operazione dopo un ricaricamento della pagina: sessione riletta prima del CSRF", async () => {
  risposte.push(json(SESSIONE), json({ segreto: "x" }));
  await attivaAuthenticator("pw");
  assert.equal(richieste[0].url, "/api/auth/session");
  assert.equal(richieste[1].url, "/api/auth/mfa/totp/attiva");
  assert.equal(richieste[1].headers["X-CSRF-Token"], CSRF);
});

test("data di attivazione in formato italiano", () => {
  assert.equal(dataAttivazione("2026-10-20T10:00:00"), "20/10/2026");
  assert.equal(dataAttivazione(""), "");
  assert.equal(dataAttivazione(null), "");
  assert.equal(dataAttivazione("non-una-data"), "");
});
