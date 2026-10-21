import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { accedi, sessioneEsistente } from "../src/lib/accesso.js";
import { logout } from "../src/lib/logout.js";
import { conservaDestinazione, destinazioneDopoAccesso, percorsoSicuro } from "../src/lib/ritornoAccesso.js";
import { leggiSessione, pulisciSessione, salvaSessione } from "../src/lib/sessione.js";
import { TESTI_ACCESSO as testi } from "../src/config/testi/accesso.js";

const CSRF = "a".repeat(64);
const SESSIONE = { utente_id: 7, ruolo_codice: "Business", csrf_token: CSRF, utente_username: " MarioRossi ",
  nome: "Mario", cognome: "Rossi" };
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
  globalThis.window = { location: { origin: "http://localhost:5180", pathname: "/", search: "", hash: "",
    replace: (url) => reindirizzamenti.push(url) }, sessionStorage: deposito() };
  richieste.length = risposte.length = reindirizzamenti.length = 0;
  pulisciSessione();
  globalThis.fetch = async (url, opzioni) => {
    richieste.push({ url, ...opzioni });
    const r = risposte.shift();
    assert.ok(r, "richiesta inattesa");
    if (r instanceof Error) throw r;
    return r;
  };
});

test("accesso con password: credenziali inviate e sessione salvata in memoria", async () => {
  risposte.push(json(SESSIONE));
  assert.equal(await accedi("MarioRossi", "Una-password-457!"), true);
  const [r] = richieste;
  assert.equal(r.url, "/api/auth/login");
  assert.equal(r.method, "POST");
  assert.equal(r.credentials, "include");
  assert.equal(r.headers["X-EQIA-Request"], "1");
  // Prima dell'accesso non c'e' sessione: niente CSRF e niente lettura di /auth/session.
  assert.equal(r.headers["X-CSRF-Token"], undefined);
  assert.deepEqual(JSON.parse(r.body), { utente_username: "MarioRossi", utente_password: "Una-password-457!" });
  assert.deepEqual({ ...leggiSessione() }, { utenteId: 7, ruoloCodice: "business", csrf: CSRF, username: "MarioRossi",
    nome: "Mario", cognome: "Rossi" });
});

test("Nazionale: la password apre solo la sfida del secondo fattore, non la sessione", async () => {
  const sfida = { requires_2fa: true, sfida: "s-1", metodo: "email", metodi: ["email"] };
  risposte.push(json(sfida));
  assert.deepEqual(await accedi("nazionale", "Una-password-457!"), sfida);
  assert.equal(leggiSessione(), null);
});

test("credenziali errate: messaggio generico, nessun rinvio alla pagina di accesso", async () => {
  risposte.push(json({}, 401));
  await assert.rejects(accedi("MarioRossi", "sbagliata"), { name: "ErroreApi", message: "Username o password errati",
    stato: 401 });
  assert.equal(leggiSessione(), null);
  assert.deepEqual(reindirizzamenti, []);
});

test("troppi tentativi sulla password: messaggio del server e attesa da Retry-After", async () => {
  risposte.push(json({ detail: "Troppi tentativi di accesso. Attendi prima di riprovare." }, 429, { "Retry-After": "30" }));
  await assert.rejects(accedi("MarioRossi", "sbagliata"), { message: "Troppi tentativi di accesso. Attendi prima di riprovare.",
    stato: 429, attesaSecondi: 30 });
});

test("codici email finiti: il blocco non si presenta come password sbagliata", async () => {
  const detail = "Troppi codici di verifica inviati. Attendi prima di richiederne un altro.";
  risposte.push(json({ detail }, 429, { "Retry-After": "2531" }));
  await assert.rejects(accedi("nazionale", "Una-password-457!"), { message: detail, stato: 429, attesaSecondi: 2531 });
});

test("blocco senza testo del server: messaggio generico del login", async () => {
  risposte.push(json(null, 429));
  await assert.rejects(accedi("MarioRossi", "x"), { message: testi.troppiTentativi, stato: 429, attesaSecondi: 0 });
});

test("attesa mostrata in secondi, oltre il minuto e mezzo in minuti", () => {
  assert.equal(testi.attesa(1), "Puoi riprovare tra 1 secondo.");
  assert.equal(testi.attesa(60), "Puoi riprovare tra 60 secondi.");
  assert.equal(testi.attesa(89), "Puoi riprovare tra 89 secondi.");
  assert.equal(testi.attesa(90), "Puoi riprovare tra 2 minuti.");
  assert.equal(testi.attesa(2531), "Puoi riprovare tra 43 minuti.");
});

test("risposta di accesso senza CSRF valido: nessuna sessione a meta'", async () => {
  risposte.push(json({ ...SESSIONE, csrf_token: "corto" }));
  await assert.rejects(accedi("MarioRossi", "Una-password-457!"), { message: "Risposta del server non valida. Riprova." });
  assert.equal(leggiSessione(), null);
});

test("server o rete non disponibili durante l'accesso", async () => {
  risposte.push(json(null, 503));
  await assert.rejects(accedi("MarioRossi", "x"), { message: "Servizio temporaneamente non disponibile. Riprova tra poco.",
    stato: 503 });
  risposte.push(new TypeError("Failed to fetch"));
  await assert.rejects(accedi("MarioRossi", "x"), { message: "Connessione non riuscita. Controlla la rete e riprova." });
});

test("sessione gia' aperta: chiesta al server una volta sola", async () => {
  risposte.push(json(SESSIONE));
  assert.equal(await sessioneEsistente(), true);
  assert.equal(richieste[0].url, "/api/auth/session");
  assert.equal(richieste[0].cache, "no-store");
  // Con la sessione in memoria non si interroga di nuovo il server.
  assert.equal(await sessioneEsistente(), true);
  assert.equal(richieste.length, 1);
});

test("nessuna sessione, errore del server o rete assente: si mostra il form", async () => {
  risposte.push(json({}, 401));
  assert.equal(await sessioneEsistente(), false);
  risposte.push(json({}, 500));
  assert.equal(await sessioneEsistente(), false);
  risposte.push(new TypeError("Failed to fetch"));
  assert.equal(await sessioneEsistente(), false);
  assert.deepEqual(reindirizzamenti, []);
});

test("uscita: CSRF inviato e sessione chiusa solo se il server conferma", async () => {
  salvaSessione(SESSIONE);
  risposte.push(new Response(null, { status: 204 }));
  await logout();
  assert.equal(richieste[0].url, "/api/auth/logout");
  assert.equal(richieste[0].method, "POST");
  assert.equal(richieste[0].headers["X-CSRF-Token"], CSRF);
  assert.equal(leggiSessione(), null);
});

test("uscita non riuscita: la sessione resta, l'utente puo' riprovare", async () => {
  salvaSessione(SESSIONE);
  risposte.push(json({}, 403));
  await assert.rejects(logout(), { message: "Uscita non riuscita. Riprova." });
  assert.equal(leggiSessione().utenteId, 7);
  risposte.push(new TypeError("Failed to fetch"));
  await assert.rejects(logout(), { message: "Connessione non riuscita. Controlla la rete e riprova." });
  assert.equal(leggiSessione().utenteId, 7);
});

test("ritorno dopo l'accesso: solo pagine interne e non pubbliche", () => {
  assert.equal(percorsoSicuro("/notizie/3?pagina=2#allegati"), "/notizie/3?pagina=2#allegati");
  assert.equal(percorsoSicuro("/profilo/"), "/profilo/");
  for (const percorso of [
    "//esempio.invalid/x", "https://esempio.invalid/", "/\\esempio.invalid", "notizie", "/notizie\n/x",
    "/", "/password-dimenticata", "/reimposta-password/", `/${"a".repeat(2048)}`, null, undefined, 42,
  ]) {
    assert.equal(percorsoSicuro(percorso), null, String(percorso));
  }
});

test("destinazione conservata alla scadenza e usata una volta sola", () => {
  Object.assign(window.location, { pathname: "/notizie/5", search: "?pagina=2", hash: "" });
  conservaDestinazione();
  assert.equal(destinazioneDopoAccesso("/dashboard"), "/notizie/5?pagina=2");
  assert.equal(destinazioneDopoAccesso("/dashboard"), "/dashboard");
  // Un valore alterato nel deposito non porta fuori dal sito.
  window.sessionStorage.setItem("eqia_ritorno_accesso", "//esempio.invalid");
  assert.equal(destinazioneDopoAccesso("/dashboard"), "/dashboard");
  // Dalla pagina di accesso non si conserva nulla.
  Object.assign(window.location, { pathname: "/", search: "?sessione=scaduta" });
  conservaDestinazione();
  assert.equal(destinazioneDopoAccesso("/dashboard"), "/dashboard");
});

test("deposito del browser non disponibile: si usa la pagina di ripiego", () => {
  const rotto = () => { throw new Error("SecurityError"); };
  window.sessionStorage = { getItem: rotto, setItem: rotto, removeItem: rotto };
  Object.assign(window.location, { pathname: "/notizie/5" });
  assert.doesNotThrow(conservaDestinazione);
  assert.equal(destinazioneDopoAccesso("/dashboard"), "/dashboard");
});
