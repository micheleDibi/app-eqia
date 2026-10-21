import assert from "node:assert/strict";
import test from "node:test";
import { payloadGestione, percorsoElenco, copiaResidenza, valoriIniziali } from "../src/lib/gestione.js";
import { PERCORSI } from "../src/config/routes/percorsi.js";
import { paginaAmmessa } from "../src/config/routes/accesso.js";
import { leggiQuery, aggiornaQuery } from "../src/lib/queryPagina.js";
import { QUERY_GESTIONE } from "../src/config/routes/query.js";

test("il salvataggio separa persona e account ed esclude campi non modificabili", () => {
  const dati = payloadGestione("attuatore", { ...valoriIniziali("attuatore"), cliente_nome: " Anna ",
    cliente_ruolo: "3", azienda_id: "17", padre_utente_id: "91", utente_id: 900, cliente_id: 700,
    username: "AnnaRossi", utente_password: "non-inviare", attivo: true });
  assert.equal(dati.cliente_nome, "Anna");
  assert.equal(dati.cliente_ruolo, 3);
  assert.equal(dati.azienda_id, 17);
  assert.equal(dati.padre_utente_id, 91);
  for (const chiave of ["utente_id", "cliente_id", "username", "utente_password", "attivo"]) assert.equal(chiave in dati, false);
});

test("il sottoscrittore non riceve automaticamente un ruolo", () => {
  const dati = payloadGestione("sottoscrittore", valoriIniziali("sottoscrittore"));
  assert.equal(dati.cliente_ruolo, null);
  assert.equal(dati.attuatore_id, null);
});

test("centro e gerarchia usano soltanto i campi previsti", () => {
  const dati = payloadGestione("centro", { ...valoriIniziali("centro"), azienda_padre_id: "12",
    azienda_codice_nazionale: "riservato", azienda_created_by: 999 });
  assert.equal(dati.azienda_padre_id, 12);
  assert.equal("azienda_created_by" in dati, false);
  assert.equal("azienda_codice_nazionale" in dati, false);
});

test("ricerca e filtri condividono il contratto e preservano caratteri speciali", () => {
  const percorso = percorsoElenco("attuatore", { search: "D’Amico & figli", ruolo: "2", centro: "17" });
  const url = new URL(percorso, "https://eqia.invalid");
  assert.equal(url.searchParams.get("search"), "D’Amico & figli");
  assert.equal(url.searchParams.get("tipo"), "attuatore");
  assert.equal(url.searchParams.get("centro"), "17");
  assert.equal(url.searchParams.get("ruolo"), "2");
});

test("azzera filtri conserva la ricerca e rifiuta identificativi malformati", () => {
  const query = aggiornaQuery("?ricerca=Anna&ruolo=2&centro=17", { ruolo: "", centro: "" }, QUERY_GESTIONE);
  assert.deepEqual(leggiQuery(query, QUERY_GESTIONE), { ricerca: "Anna", ruolo: "", centro: "" });
  assert.equal(leggiQuery("?centro=0", QUERY_GESTIONE).centro, "");
});

test("copia residenza non altera altri dati né il valore originale", () => {
  const originali = { cliente_indirizzo: "Via Roma", cliente_civico: "7", cliente_citta: "Bari",
    cliente_CAP: "70121", cliente_provincia: "BA", cliente_email: "anna@example.org" };
  const risultato = copiaResidenza(originali);
  assert.equal(risultato.cliente_indirizzoDomicilio, "Via Roma");
  assert.equal(risultato.cliente_CAPDomicilio, "70121");
  assert.equal(risultato.cliente_email, originali.cliente_email);
  assert.equal("cliente_CAPDomicilio" in originali, false);
});

test("rotte per entità e accesso rispettano il catalogo dei quattro ruoli", () => {
  assert.equal(PERCORSI.attuatori.dettaglio(420), "/attuatori/420");
  assert.equal(PERCORSI.sottoscrittori.dettaglio(420), "/sottoscrittori/420");
  assert.equal(PERCORSI.aziende.nuovo, "/centri/nuovo");
  assert.throws(() => PERCORSI.attuatori.dettaglio("../../profilo"));
  assert.equal(paginaAmmessa("business", "/attuatori/420"), true);
  assert.equal(paginaAmmessa("startup", "/attuatori/420"), false);
  assert.equal(paginaAmmessa("startup-for-education", "/centri/17"), false);
  assert.equal(paginaAmmessa("startup-for-education", "/sottoscrittori/420"), true);
});
