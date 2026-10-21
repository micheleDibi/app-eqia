import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  cambiaMetodo, metodiAlternativi, operazioniAccessoTotp, operazioniPerMetodo, verificaPasskey,
} from "../src/lib/secondoFattore.js";
import { operazioniAccessoOtp, operazioniContattoOtp } from "../src/lib/otp.js";
import {
  b64url, messaggioErrorePasskey, opzioniCreazione, opzioniRichiesta, passkeySupportate, serializza,
} from "../src/lib/passkey.js";
import { TESTI_ACCESSO } from "../src/config/testi/accesso.js";
import { leggiSessione, pulisciSessione, salvaSessione } from "../src/lib/sessione.js";

const CSRF = "c".repeat(64);
const SESSIONE = { utente_id: 1, ruolo_codice: "nazionale", csrf_token: CSRF };
const SFIDA = { requires_2fa: true, sfida: "sfida-1", metodo: "email", metodi: ["passkey", "totp", "email"] };
const richieste = [];
const risposte = [];
const reindirizzamenti = [];
const json = (dati, status = 200, headers = {}) => new Response(JSON.stringify(dati), { status, headers });
const corpo = (i = 0) => JSON.parse(richieste[i].body);
const navigatoreOriginale = Object.getOwnPropertyDescriptor(globalThis, "navigator");

beforeEach(() => {
  globalThis.window = { location: { origin: "http://localhost:5180", pathname: "/", search: "", hash: "",
    replace: (url) => reindirizzamenti.push(url) } };
  richieste.length = risposte.length = reindirizzamenti.length = 0;
  pulisciSessione();
  globalThis.fetch = async (url, opzioni) => {
    richieste.push({ url, ...opzioni });
    const r = risposte.shift();
    assert.ok(r, "richiesta inattesa");
    return r;
  };
});

afterEach(() => {
  if (navigatoreOriginale) Object.defineProperty(globalThis, "navigator", navigatoreOriginale);
});

test("metodo scelto al login: authenticator senza reinvio, email e passkey con il codice via email", () => {
  assert.equal(operazioniPerMetodo("totp"), operazioniAccessoTotp);
  assert.equal(operazioniAccessoTotp.invia, null);
  assert.equal(operazioniPerMetodo("email"), operazioniAccessoOtp);
  assert.equal(typeof operazioniAccessoOtp.invia, "function");
});

test("altri metodi proposti: quelli posseduti, escluso quello in corso", () => {
  assert.deepEqual(metodiAlternativi(SFIDA), ["passkey", "totp"]);
  assert.deepEqual(metodiAlternativi({ metodo: "email", metodi: ["email"] }), []);
  assert.deepEqual(metodiAlternativi({ metodo: "verifica_email" }), []);
  assert.deepEqual(metodiAlternativi(undefined), []);
});

test("codice via email giusto: la sessione nasce solo adesso", async () => {
  risposte.push(json(SESSIONE));
  await operazioniAccessoOtp.verifica({ sfida: "sfida-1", codice: "123456" });
  assert.equal(richieste[0].url, "/api/auth/verifica-otp");
  assert.equal(richieste[0].method, "POST");
  assert.equal(richieste[0].headers["X-CSRF-Token"], undefined);
  assert.deepEqual(corpo(), { sfida: "sfida-1", codice: "123456" });
  assert.equal(leggiSessione().utenteId, 1);
});

test("codice sbagliato o sfida scaduta: errore del server, nessuna sessione, nessun rinvio", async () => {
  risposte.push(json({ detail: "Codice non valido. Tentativi rimasti: 2." }, 400));
  await assert.rejects(operazioniAccessoOtp.verifica({ sfida: "sfida-1", codice: "000000" }),
    { name: "ErroreApi", message: "Codice non valido. Tentativi rimasti: 2.", stato: 400 });
  risposte.push(json({}, 401));
  await assert.rejects(operazioniAccessoOtp.verifica({ sfida: "vecchia", codice: "123456" }),
    { message: "Verifica non riuscita. Riprova.", stato: 401 });
  assert.equal(leggiSessione(), null);
  assert.deepEqual(reindirizzamenti, []);
});

test("reinvio del codice: un minuto di attesa letto dal server", async () => {
  risposte.push(json({ inviato: true }));
  assert.deepEqual(await operazioniAccessoOtp.invia(SFIDA), { inviato: true });
  assert.equal(richieste[0].url, "/api/auth/rigenera-otp");
  assert.deepEqual(corpo(), { sfida: "sfida-1" });
  risposte.push(json({}, 429, { "Retry-After": "60" }));
  await assert.rejects(operazioniAccessoOtp.invia(SFIDA), { stato: 429, attesaSecondi: 60 });
});

test("authenticator: codice verificato e sessione aperta", async () => {
  risposte.push(json(SESSIONE));
  await operazioniAccessoTotp.verifica({ sfida: "sfida-1", codice: "654321" });
  assert.equal(richieste[0].url, "/api/auth/mfa/verifica-totp");
  assert.equal(leggiSessione().csrf, CSRF);
  risposte.push(json({ detail: "Codice gia' usato." }, 400));
  pulisciSessione();
  await assert.rejects(operazioniAccessoTotp.verifica({ sfida: "sfida-1", codice: "654321" }),
    { message: "Codice gia' usato." });
  assert.equal(leggiSessione(), null);
});

test("passkey al login: la risposta del telefono apre la sessione", async () => {
  const credenziale = { id: "cred", response: {} };
  risposte.push(json(SESSIONE));
  await verificaPasskey({ ...SFIDA, metodo: "passkey" }, credenziale);
  assert.equal(richieste[0].url, "/api/auth/mfa/verifica-passkey");
  assert.deepEqual(corpo(), { sfida: "sfida-1", credenziale });
  assert.equal(leggiSessione().utenteId, 1);
});

test("cambio di metodo: nuova sfida, ancora nessuna sessione", async () => {
  const nuova = { requires_2fa: true, sfida: "sfida-2", metodo: "totp", metodi: SFIDA.metodi };
  risposte.push(json(nuova));
  assert.deepEqual(await cambiaMetodo(SFIDA, "totp"), nuova);
  assert.equal(richieste[0].url, "/api/auth/mfa/metodo");
  assert.deepEqual(corpo(), { sfida: "sfida-1", metodo: "totp" });
  assert.equal(leggiSessione(), null);
  risposte.push(json({ detail: "Metodo non disponibile per questo account." }, 400));
  await assert.rejects(cambiaMetodo(SFIDA, "passkey"), { message: "Metodo non disponibile per questo account." });
});

test("verifica di un contatto dalla scheda: sessione e CSRF obbligatori", async () => {
  salvaSessione(SESSIONE);
  const operazioni = operazioniContattoOtp(7, "cellulare", "+393331234567");
  risposte.push(json({ inviato: true }), json({ verificato: true }));
  await operazioni.invia();
  await operazioni.verifica({ codice: "123456" });
  assert.equal(richieste[0].url, "/api/clienti/7/contatti/cellulare/genera-otp");
  assert.deepEqual(corpo(0), { valore: "+393331234567" });
  assert.equal(richieste[1].url, "/api/clienti/7/contatti/cellulare/verifica-otp");
  assert.deepEqual(corpo(1), { codice: "123456" });
  assert.ok(richieste.every((r) => r.headers["X-CSRF-Token"] === CSRF));
});

test("verifica di un contatto a sessione scaduta: rinvio alla pagina di accesso", async () => {
  salvaSessione(SESSIONE);
  risposte.push(json({}, 401));
  await assert.rejects(operazioniContattoOtp(7, "email", "a@example.org").invia(), { stato: 401 });
  assert.equal(leggiSessione(), null);
  assert.deepEqual(reindirizzamenti, ["/?sessione=scaduta"]);
});

test("base64url: andata e ritorno senza padding ne' caratteri riservati", () => {
  const byte = Uint8Array.from({ length: 256 }, (_, i) => i);
  const testo = b64url.a(byte.buffer);
  assert.match(testo, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(b64url.da(testo), byte);
  for (const lunghezza of [1, 2, 3, 4]) {
    const parziale = byte.slice(250, 250 + lunghezza);
    assert.deepEqual(b64url.da(b64url.a(parziale.buffer)), parziale);
  }
});

test("passkey supportate solo con le API del browser", () => {
  assert.equal(passkeySupportate(), false);
  window.PublicKeyCredential = function PublicKeyCredential() {};
  Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true });
  assert.equal(passkeySupportate(), false);
  Object.defineProperty(globalThis, "navigator", { value: { credentials: {} }, configurable: true });
  assert.equal(passkeySupportate(), true);
});

test("opzioni del server convertite per i browser senza parse*FromJSON", () => {
  const sfida = b64url.a(Uint8Array.of(1, 2, 3).buffer);
  const id = b64url.a(Uint8Array.of(9, 9).buffer);
  const creazione = opzioniCreazione({ challenge: sfida, rp: { id: "localhost" }, user: { id, name: "nazionale" },
    excludeCredentials: [{ id, type: "public-key" }] });
  assert.deepEqual(creazione.challenge, Uint8Array.of(1, 2, 3));
  assert.deepEqual(creazione.user, { id: Uint8Array.of(9, 9), name: "nazionale" });
  assert.deepEqual(creazione.excludeCredentials, [{ id: Uint8Array.of(9, 9), type: "public-key" }]);
  assert.deepEqual(creazione.rp, { id: "localhost" });

  const richiesta = opzioniRichiesta({ challenge: sfida, allowCredentials: [{ id, type: "public-key" }] });
  assert.deepEqual(richiesta.challenge, Uint8Array.of(1, 2, 3));
  assert.deepEqual(richiesta.allowCredentials[0].id, Uint8Array.of(9, 9));
  assert.deepEqual(opzioniRichiesta({ challenge: sfida }).allowCredentials, []);
});

test("opzioni del server lasciate al browser quando sa convertirle", () => {
  window.PublicKeyCredential = {
    parseCreationOptionsFromJSON: (json) => ({ convertita: "creazione", json }),
    parseRequestOptionsFromJSON: (json) => ({ convertita: "richiesta", json }),
  };
  assert.equal(opzioniCreazione({ challenge: "x" }).convertita, "creazione");
  assert.equal(opzioniRichiesta({ challenge: "x" }).convertita, "richiesta");
});

test("credenziale del browser serializzata per il server", () => {
  const buffer = (...valori) => Uint8Array.of(...valori).buffer;
  const registrazione = serializza({
    id: "cred-1", rawId: buffer(1), type: "public-key", authenticatorAttachment: "cross-platform",
    getClientExtensionResults: () => ({ credProps: { rk: true } }),
    response: { clientDataJSON: buffer(2), attestationObject: buffer(3), getTransports: () => ["hybrid"] },
  });
  assert.deepEqual(registrazione, {
    id: "cred-1", rawId: "AQ", type: "public-key", authenticatorAttachment: "cross-platform",
    clientExtensionResults: { credProps: { rk: true } },
    response: { clientDataJSON: "Ag", attestationObject: "Aw", transports: ["hybrid"] },
  });

  const asserzione = serializza({ id: "cred-1", rawId: buffer(1), type: "public-key",
    response: { clientDataJSON: buffer(2), authenticatorData: buffer(4), signature: buffer(5), userHandle: buffer(6) } });
  assert.deepEqual(asserzione.response, { clientDataJSON: "Ag", authenticatorData: "BA", signature: "BQ", userHandle: "Bg" });
  assert.equal(asserzione.authenticatorAttachment, undefined);
  assert.deepEqual(asserzione.clientExtensionResults, {});

  const moderna = { toJSON: () => ({ id: "da-browser" }) };
  assert.deepEqual(serializza(moderna), { id: "da-browser" });
});

test("errori della passkey tradotti in frasi", () => {
  const t = TESTI_ACCESSO.passkey;
  const errore = (name, message = "") => Object.assign(new Error(message), { name });
  assert.equal(messaggioErrorePasskey(errore("NotAllowedError")), t.annullata);
  assert.equal(messaggioErrorePasskey(errore("AbortError")), t.annullata);
  assert.equal(messaggioErrorePasskey(errore("InvalidStateError")), t.giaRegistrata);
  assert.equal(messaggioErrorePasskey(errore("SecurityError")), t.dominio);
  assert.equal(messaggioErrorePasskey(errore("ErroreApi", "Passkey non riconosciuta.")), "Passkey non riconosciuta.");
  assert.equal(messaggioErrorePasskey(errore("UnknownError")), t.generico);
  assert.equal(messaggioErrorePasskey(undefined), t.generico);
});
