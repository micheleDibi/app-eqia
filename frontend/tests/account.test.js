import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cambiaStatoAccount, cambioStato, leggiAccount, pillolaStato, statoRecapito } from "../src/lib/account.js";
import { TESTI_ACCOUNT as testi } from "../src/config/testi/account.js";
import { pulisciSessione, salvaSessione } from "../src/lib/sessione.js";

const richieste = [];
const risposte = [];
const json = (dati, status = 200) => new Response(JSON.stringify(dati), { status });

beforeEach(() => {
  globalThis.window = { location: { origin: "http://localhost:5180", pathname: "/attuatori/1", search: "", hash: "",
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

const salvato = (valore, verificato, verificato_il = null) => ({ valore, verificato, verificato_il });

test("recapito verificato: pillola e data, niente pulsante", () => {
  const stato = statoRecapito({ disponibile: true, stato: salvato("a@example.org", true, "2026-10-20T10:00:00") },
    "a@example.org");
  assert.deepEqual(stato, { verificato: true, verificatoIl: "2026-10-20T10:00:00", mostraVerifica: false,
    verificaDisabilitata: false, daSalvare: false });
});

test("recapito da verificare: pulsante attivo solo con il valore salvato", () => {
  const verifica = { disponibile: true, stato: salvato("a@example.org", false) };
  assert.equal(statoRecapito(verifica, "a@example.org").mostraVerifica, true);
  assert.equal(statoRecapito(verifica, "a@example.org").verificaDisabilitata, false);
  // Valore a video diverso da quello salvato: pulsante spento e invito a salvare.
  const diverso = statoRecapito(verifica, "b@example.org");
  assert.equal(diverso.verificaDisabilitata, true);
  assert.equal(diverso.daSalvare, true);
  // Un campo vuoto non risulta mai verificato e non si verifica.
  const vuoto = statoRecapito({ disponibile: true, stato: salvato("", true) }, "");
  assert.equal(vuoto.verificato, false);
  assert.equal(vuoto.verificaDisabilitata, true);
  assert.equal(vuoto.daSalvare, false);
});

test("stato dell'account: pillola e cambio proposto", () => {
  assert.deepEqual(pillolaStato("attivo"), { testo: "Attivo", tono: "positivo" });
  assert.deepEqual(pillolaStato("disattivato"), { testo: "Disattivo", tono: "negativo" });
  assert.equal(pillolaStato("in_attesa").testo, "In attesa di attivazione");
  assert.equal(pillolaStato(undefined), null);
  const c = testi.stato.conferma;
  assert.deepEqual(cambioStato("attivo"), { attivo: false, etichetta: "Disattiva", conferma: c.disattiva });
  assert.deepEqual(cambioStato("disattivato"), { attivo: true, etichetta: "Attiva", conferma: c.riattiva });
  // Da "in attesa" l'attivazione a mano avvisa che le credenziali non partono.
  assert.equal(cambioStato("in_attesa").conferma, c.attivaInAttesa);
});

test("lettura dell'account e cambio di stato: indirizzi, metodo, corpo e CSRF", async () => {
  salvaSessione({ utente_id: 1, ruolo_codice: "nazionale", csrf_token: "a".repeat(64) });
  const stato = { email: salvato("a@example.org", true), cellulare: salvato("", false), attivazione: "attivo" };
  risposte.push(json(stato), json({ ...stato, attivazione: "disattivato" }));
  assert.deepEqual(await leggiAccount(12), stato);
  assert.equal((await cambiaStatoAccount(12, false)).attivazione, "disattivato");
  const [lettura, cambio] = richieste;
  assert.ok(lettura.url.endsWith("/clienti/12/contatti"));
  assert.ok(cambio.url.endsWith("/clienti/12/account/stato"));
  assert.equal(cambio.method, "PUT");
  assert.deepEqual(JSON.parse(cambio.body), { attivo: false });
  assert.equal(cambio.headers["X-CSRF-Token"], "a".repeat(64));
});

test("il cambio di stato rifiutato porta il messaggio del server", async () => {
  salvaSessione({ utente_id: 1, ruolo_codice: "business", csrf_token: "a".repeat(64) });
  risposte.push(json({ detail: "Solo il Nazionale può eseguire questa operazione." }, 403));
  await assert.rejects(cambiaStatoAccount(12, false),
    (errore) => errore.stato === 403 && /Solo il Nazionale/.test(errore.message));
});

// Sorgenti letti come testo (i test non importano .jsx).
test("Attiva/Disattiva compare solo con il permesso, e chiede conferma", () => {
  const sezione = readFileSync(new URL("../src/components/account/SezioneAccount.jsx", import.meta.url), "utf8");
  assert.match(sezione, /\{permessi\.statoAccount && \(/);
  assert.match(sezione, /onClick=\{\(\) => setConferma\(cambio\)\}/);
  assert.match(sezione, /<DialogoConferma /);
});
