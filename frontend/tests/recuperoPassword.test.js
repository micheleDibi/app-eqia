import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { confermaReset, richiediRecupero, verificaLinkReset } from "../src/lib/recuperoPassword.js";
import { azzeraPerTest, leggiTokenDallUrl, ripulisciUrlDalToken } from "../src/lib/resetToken.js";
import { TESTI_RESET } from "../src/config/testi/accesso.js";
import { pulisciSessione } from "../src/lib/sessione.js";

const richieste = [];
const risposte = [];
const sostituzioni = [];
const reindirizzamenti = [];
const json = (dati, status = 200) => new Response(JSON.stringify(dati), { status });

beforeEach(() => {
  globalThis.window = {
    location: { origin: "http://localhost:5180", pathname: "/reimposta-password", search: "", hash: "",
      replace: (url) => reindirizzamenti.push(url) },
    history: { state: { idx: 3 }, replaceState: (...argomenti) => sostituzioni.push(argomenti) },
  };
  richieste.length = risposte.length = sostituzioni.length = reindirizzamenti.length = 0;
  pulisciSessione();
  azzeraPerTest();
  globalThis.fetch = async (url, opzioni) => {
    richieste.push({ url, ...opzioni });
    const r = risposte.shift();
    assert.ok(r, "richiesta inattesa");
    if (r instanceof Error) throw r;
    return r;
  };
});

test("richiesta di recupero: solo l'email, senza sessione ne' CSRF", async () => {
  risposte.push(json({ messaggio: "ok" }));
  assert.equal(await richiediRecupero("mario.rossi@example.org"), undefined);
  const [r] = richieste;
  assert.equal(r.url, "/api/auth/password-reset/request");
  assert.equal(r.method, "POST");
  assert.equal(r.headers["X-CSRF-Token"], undefined);
  assert.deepEqual(JSON.parse(r.body), { email: "mario.rossi@example.org" });
});

test("richiesta di recupero: stesso esito anche con errori, limiti o rete assente", async () => {
  // Chi chiede non deve capire se l'indirizzo esiste ne' se qualcosa e' andato storto.
  risposte.push(json({}, 429), json({}, 500), json({}, 401), new TypeError("Failed to fetch"));
  for (let i = 0; i < 4; i += 1) assert.equal(await richiediRecupero("x@example.org"), undefined);
  assert.equal(richieste.length, 4);
  assert.deepEqual(reindirizzamenti, []);
});

test("verifica del link: token codificato nell'indirizzo", async () => {
  risposte.push(json({ valido: true }));
  assert.deepEqual(await verificaLinkReset("a b/c+d"), { stato: "valido" });
  assert.equal(richieste[0].url, "/api/auth/password-reset/validate?token=a%20b%2Fc%2Bd");
  assert.equal(richieste[0].method, undefined);
});

test("verifica del link: i motivi del server hanno tutti un testo", async () => {
  for (const motivo of ["scaduto", "gia_usato", "non_valido"]) {
    risposte.push(json({ valido: false, motivo }));
    assert.deepEqual(await verificaLinkReset("t"), { stato: "non_valido", motivo });
    assert.ok(TESTI_RESET.motivi[motivo], motivo);
  }
});

test("verifica del link: risposta inattesa o rete assente", async () => {
  risposte.push(json({}), json({ valido: "true" }), json(null, 500));
  for (let i = 0; i < 3; i += 1) {
    assert.deepEqual(await verificaLinkReset("t"), { stato: "non_valido", motivo: "non_valido" });
  }
  risposte.push(new TypeError("Failed to fetch"));
  assert.deepEqual(await verificaLinkReset("t"), { stato: "non_valido", motivo: "rete" });
  assert.ok(TESTI_RESET.motivi.rete);
});

test("nuova password salvata", async () => {
  risposte.push(json({ messaggio: "ok" }));
  assert.deepEqual(await confermaReset({ token: "t", password: "Fiume-Sereno-2026", conferma: "Fiume-Sereno-2026" }),
    { ok: true });
  assert.equal(richieste[0].url, "/api/auth/password-reset/confirm");
  assert.equal(richieste[0].headers["X-CSRF-Token"], undefined);
  assert.deepEqual(JSON.parse(richieste[0].body),
    { token: "t", password: "Fiume-Sereno-2026", password_conferma: "Fiume-Sereno-2026" });
});

test("password rifiutata dalla policy: regole evidenziate e messaggi del server", async () => {
  risposte.push(json({ detail: { regole_violate: ["lunghezza_minima", "uguale_email"],
    messaggi: ["Deve avere almeno 8 caratteri", "Non può coincidere con l'indirizzo email"] } }, 422));
  assert.deepEqual(await confermaReset({ token: "t", password: "mario", conferma: "mario" }), {
    ok: false, regoleRifiutate: ["lunghezza_minima", "identificativo"],
    errore: "Deve avere almeno 8 caratteri Non può coincidere con l'indirizzo email",
  });
});

test("password diverse o link non piu' valido", async () => {
  risposte.push(json({ detail: { messaggi: ["Le due password non coincidono"] } }, 422));
  assert.deepEqual(await confermaReset({ token: "t", password: "a", conferma: "b" }),
    { ok: false, regoleRifiutate: [], errore: "Le due password non coincidono" });
  risposte.push(json({ detail: "Link scaduto." }, 400));
  assert.equal((await confermaReset({ token: "t", password: "a", conferma: "a" })).errore, "Link scaduto.");
});

test("errore del server o rete assente durante il salvataggio", async () => {
  risposte.push(json(null, 500));
  assert.deepEqual(await confermaReset({ token: "t", password: "a", conferma: "a" }),
    { ok: false, regoleRifiutate: [], errore: TESTI_RESET.errore });
  risposte.push(new TypeError("Failed to fetch"));
  assert.deepEqual(await confermaReset({ token: "t", password: "a", conferma: "a" }),
    { ok: false, regoleRifiutate: [], errore: TESTI_RESET.rete });
});

test("token letto una volta e tolto dall'indirizzo, conservando il resto", () => {
  Object.assign(window.location, { search: "?token=abc123&origine=mail", hash: "#modulo" });
  assert.equal(leggiTokenDallUrl(), "abc123");
  ripulisciUrlDalToken();
  assert.deepEqual(sostituzioni, [[{ idx: 3 }, "", "/reimposta-password?origine=mail#modulo"]]);
  // StrictMode rilegge dopo la pulizia: il token resta quello catturato.
  window.location.search = "?origine=mail";
  assert.equal(leggiTokenDallUrl(), "abc123");
  ripulisciUrlDalToken();
  assert.equal(sostituzioni.length, 1);
});

test("token assente o vuoto", () => {
  assert.equal(leggiTokenDallUrl(), null);
  azzeraPerTest();
  window.location.search = "?token=%20%20";
  assert.equal(leggiTokenDallUrl(), null);
  azzeraPerTest();
  window.location.search = "?token=solo";
  assert.equal(leggiTokenDallUrl(), "solo");
  ripulisciUrlDalToken();
  assert.equal(sostituzioni.at(-1)[2], "/reimposta-password");
});
