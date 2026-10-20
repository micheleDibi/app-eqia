import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PERCORSI } from "../src/config/routes/percorsi.js";
import { GRUPPI_NOTIZIA, TESTI_MODULO_NOTIZIA as testi } from "../src/config/testi/notizie.js";
import {
  LIMITE_NOTIZIE, MAX_BYTE_FILE_NOTIZIA, NOTIZIE_DASHBOARD, alternaScelta, dataNotizia, linkValido,
  moduloDaScheda, moduloVuoto, nomeDaIntestazione, notizieDashboard, opzioniSottotag, opzioniTag, paginaNotizie,
  payloadNotizia, problemaAllegato, problemaImmagine, problemaModulo, queryNotizie, salvaNotizia, sommarioNotizia,
  sottotagDelTag, testoGruppi, testoSottotag, filtroConSottotag,
} from "../src/lib/notizie.js";
import { pulisciSessione, salvaSessione } from "../src/lib/sessione.js";
import { QUERY_NOTIZIE } from "../src/config/routes/query.js";
import { leggiQuery } from "../src/lib/queryPagina.js";

const TUTTI = GRUPPI_NOTIZIA.map((g) => g.valore);
const CATEGORIE = [
  { tag_id: 1, tag_descrizione: "Bandi", sottotag: [
    { tag_dettaglio_id: 1, tag_dettaglio_descrizione: "Bandi regionali" },
    { tag_dettaglio_id: 2, tag_dettaglio_descrizione: "Bandi europei" }] },
  { tag_id: 3, tag_descrizione: "Mondo", sottotag: [] },
];
const richieste = [];
const risposte = [];
const json = (dati, status = 200) => new Response(JSON.stringify(dati), { status });
const vuota = () => new Response(null, { status: 204 });

beforeEach(() => {
  globalThis.window = { location: { origin: "http://localhost:5180", pathname: "/notizie/nuova", search: "", hash: "",
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

test("percorsi di elenco, nuova, scheda e modifica", () => {
  assert.equal(PERCORSI.notizie.elenco, "/notizie");
  assert.equal(PERCORSI.notizie.nuovo, "/notizie/nuova");
  assert.equal(PERCORSI.notizie.modello, "/notizie/:notiziaId");
  assert.equal(PERCORSI.notizie.dettaglio(7), "/notizie/7");
  assert.equal(PERCORSI.notizie.modificaModello, "/notizie/:notiziaId/modifica");
  assert.equal(PERCORSI.notizie.modifica(7), "/notizie/7/modifica");
  assert.throws(() => PERCORSI.notizie.modifica("abc"), TypeError);
});

test("i gruppi dei destinatari vengono dal catalogo dei ruoli, senza il Nazionale", () => {
  assert.deepEqual(GRUPPI_NOTIZIA, [
    { valore: "business", etichetta: "Business" },
    { valore: "startup", etichetta: "Startup" },
    { valore: "startup-for-education", etichetta: "Startup for Education" },
  ]);
});

test("l'elenco si legge a blocchi di 20, dalla prima pagina", () => {
  assert.equal(queryNotizie(), `/notizie/?limit=${LIMITE_NOTIZIE}`);
  assert.equal(queryNotizie(3), "/notizie/?limit=3");
  const piena = paginaNotizie(Array.from({ length: LIMITE_NOTIZIE }, (_, i) => ({ notizia_id: i + 1 })));
  assert.equal(piena.altri, true);
  assert.equal(piena.elementi[0].id, 1);
  assert.equal(paginaNotizie([{ notizia_id: 5 }]).altri, false);
});

test("Dashboard: fino a tre notizie degli ultimi 30 giorni, altrimenti solo la piu' recente", () => {
  const adesso = new Date(2026, 9, 16, 12, 0);
  const notizia = (id, data) => ({ notizia_id: id, notizia_created_at: data });
  const ids = (righe) => notizieDashboard(righe, adesso).map((r) => r.notizia_id);
  assert.equal(NOTIZIE_DASHBOARD, 3);
  assert.deepEqual(ids([notizia(4, "2026-10-15T09:00:00"), notizia(3, "2026-10-01T09:00:00"),
    notizia(2, "2026-09-20T09:00:00")]), [4, 3, 2]);
  assert.deepEqual(ids([notizia(4, "2026-10-15T09:00:00"), notizia(3, "2026-09-16T13:00:00"),
    notizia(2, "2026-09-16T11:00:00")]), [4, 3]);
  assert.deepEqual(ids([notizia(10, "2025-07-25T12:35:39"), notizia(9, "2025-06-12T10:09:51")]), [10]);
  assert.deepEqual(ids([notizia(7, null)]), [7]);
  assert.deepEqual(ids([]), []);
  assert.equal(notizieDashboard([1, 2, 3, 4].map((n) => notizia(n, "2026-10-10T09:00:00")), adesso).length, 3);
});

test("data e sommario di una notizia", () => {
  assert.equal(dataNotizia("2026-10-16T11:30:00"), "16/10/2026");
  assert.equal(dataNotizia(null), "");
  assert.equal(sommarioNotizia({ notizia_riassunto: " Breve ", notizia_sottotitolo: "Sotto" }), "Breve");
  assert.equal(sommarioNotizia({ notizia_riassunto: "", notizia_sottotitolo: "Sotto" }), "Sotto");
  assert.equal(sommarioNotizia({ notizia_riassunto: null, notizia_sottotitolo: null }), "");
});

test("la tendina dei gruppi dice cosa e' spuntato, nell'ordine della tendina", () => {
  assert.equal(testoGruppi(TUTTI), testi.destinatari.tutti);
  assert.equal(testoGruppi([]), testi.destinatari.nessuno);
  assert.equal(testoGruppi(["startup", "business"]), "Business, Startup");
  // In fondo alla scheda della notizia.
  assert.equal(testoGruppi(TUTTI, { tutti: "Tutti gli attuatori" }), "Tutti gli attuatori");
  assert.equal(testoGruppi(["startup-for-education"], { tutti: "Tutti gli attuatori" }), "Startup for Education");
  assert.deepEqual(alternaScelta(["startup"], "business", GRUPPI_NOTIZIA), ["business", "startup"]);
  assert.deepEqual(alternaScelta(TUTTI, "business", GRUPPI_NOTIZIA), ["startup", "startup-for-education"]);
});

test("il modulo nuovo ha la prima sezione, nessun argomento e tutti i gruppi", () => {
  assert.deepEqual(moduloVuoto(CATEGORIE), {
    titolo: "", sottotitolo: "", riassunto: "", testo: "", link: "", categoria: "1", sottotag: [], gruppi: TUTTI,
  });
  assert.equal(moduloVuoto().categoria, "");
});

test("il modulo dalla scheda tiene sezione e argomenti, anche disattivati", () => {
  const scheda = {
    notizia_titolo: "Titolo", notizia_sottotitolo: null, notizia_riassunto: "", notizia_descrizione: "Testo",
    notizia_url: "", tag_id: 2, tag_descrizione: "Vecchia", gruppi: ["startup-for-education", "business"],
    sottotag: [{ tag_dettaglio_id: 9, tag_dettaglio_descrizione: "Spento" }],
  };
  const modulo = moduloDaScheda(scheda);
  assert.equal(modulo.categoria, "2");
  assert.deepEqual(modulo.sottotag, [9]);
  assert.equal(modulo.sottotitolo, "");
  assert.deepEqual(modulo.gruppi, ["business", "startup-for-education"]);
  // La sezione disattivata della notizia resta fra le scelte, in fondo.
  assert.deepEqual(opzioniTag(CATEGORIE, scheda).map((o) => o.valore), ["1", "3", "2"]);
  assert.deepEqual(opzioniTag(CATEGORIE).map((o) => o.etichetta), ["Bandi", "Mondo"]);
  // Gli argomenti della notizia restano solo con la sua sezione.
  assert.deepEqual(opzioniSottotag(CATEGORIE, "2", scheda), [{ valore: 9, etichetta: "Spento" }]);
  assert.deepEqual(opzioniSottotag(CATEGORIE, "1", scheda).map((o) => o.valore), [1, 2]);
  assert.deepEqual(opzioniSottotag(CATEGORIE, "3", scheda), []);
});

test("tendina degli argomenti: testo e scelte nell'ordine delle opzioni", () => {
  const opzioni = opzioniSottotag(CATEGORIE, "1");
  assert.equal(testoSottotag([], opzioni), testi.contenuto.nessunSottotag);
  assert.equal(testoSottotag([2, 1], opzioni), "Bandi regionali, Bandi europei");
  assert.deepEqual(alternaScelta([2], 1, opzioni), [1, 2]);
  assert.deepEqual(alternaScelta([1, 2], 1, opzioni), [2]);
});

test("filtri dell'elenco: gli argomenti valgono solo con la sezione", () => {
  assert.equal(queryNotizie(undefined, { tag: "1", sottotag: ["2"] }), `/notizie/?limit=${LIMITE_NOTIZIE}&tag_id=1&tag_dettaglio_id=2`);
  assert.equal(queryNotizie(undefined, { tag: "1", sottotag: ["1", "2"] }),
    `/notizie/?limit=${LIMITE_NOTIZIE}&tag_id=1&tag_dettaglio_id=1&tag_dettaglio_id=2`);
  assert.equal(queryNotizie(undefined, { tag: "", sottotag: ["2"] }), `/notizie/?limit=${LIMITE_NOTIZIE}`);
  assert.deepEqual(sottotagDelTag(CATEGORIE, "1").map((s) => s.tag_dettaglio_id), [1, 2]);
  assert.deepEqual(sottotagDelTag(CATEGORIE, ""), []);
});

test("filtri dell'elenco: piu' argomenti della stessa sezione, aggiunti e tolti a ogni clic", () => {
  const bandi = CATEGORIE[0];
  assert.deepEqual(filtroConSottotag({ tag: "", sottotag: [] }, bandi, "2"), { tag: "1", sottotag: ["2"] });
  assert.deepEqual(filtroConSottotag({ tag: "3", sottotag: ["9"] }, bandi, "2"), { tag: "1", sottotag: ["2"] });
  assert.deepEqual(filtroConSottotag({ tag: "1", sottotag: ["2"] }, bandi, "1"), { tag: "1", sottotag: ["1", "2"] });
  assert.deepEqual(filtroConSottotag({ tag: "1", sottotag: ["1", "2"] }, bandi, "1"), { tag: "1", sottotag: ["2"] });
  assert.deepEqual(filtroConSottotag({ tag: "1", sottotag: ["2"] }, bandi, "2"), { tag: "1", sottotag: [] });
  // Nell'indirizzo: id ripetuto, senza doppioni ne' valori non validi.
  assert.deepEqual(leggiQuery("?tag=1&sottotag=2&sottotag=1&sottotag=2&sottotag=x", QUERY_NOTIZIE),
    { tag: "1", sottotag: ["2", "1"] });
  assert.deepEqual(leggiQuery("", QUERY_NOTIZIE), { tag: "", sottotag: [] });
});

test("il corpo della richiesta ha i nomi delle colonne e i testi senza spazi ai bordi", () => {
  const modulo = { ...moduloVuoto(CATEGORIE), titolo: "  Avviso ", testo: "\nRiga 1\nRiga 2\n", link: " https://example.org/a " };
  assert.deepEqual(payloadNotizia(modulo), {
    notizia_titolo: "Avviso", notizia_sottotitolo: "", notizia_riassunto: "", notizia_descrizione: "Riga 1\nRiga 2",
    notizia_url: "https://example.org/a", tag_id: 1, sottotag: [], gruppi: TUTTI,
  });
});

test("nel corpo vanno solo i gruppi che esistono", () => {
  const modulo = { ...moduloVuoto(CATEGORIE), gruppi: ["nazionale", "startup", "business"] };
  assert.deepEqual(payloadNotizia(modulo).gruppi, ["business", "startup"]);
});

test("i controlli del modulo, nell'ordine dei campi", () => {
  const valido = { ...moduloVuoto(CATEGORIE), titolo: "T", testo: "X" };
  const p = testi.problemi;
  assert.equal(problemaModulo(valido), "");
  assert.equal(problemaModulo({ ...valido, titolo: "  " }), p.titolo);
  assert.equal(problemaModulo({ ...valido, testo: "" }), p.testo);
  assert.equal(problemaModulo({ ...valido, link: "javascript:alert(1)" }), p.link);
  assert.equal(problemaModulo({ ...valido, categoria: "" }), p.categoria);
  assert.equal(problemaModulo({ ...valido, gruppi: [] }), p.gruppi);
  assert.equal(problemaModulo({ ...valido, gruppi: ["nazionale"] }), p.gruppi);
  assert.ok(linkValido(""));
  assert.ok(linkValido("http://example.org"));
  assert.ok(!linkValido("www.example.org"));
  assert.ok(!linkValido("https:// spazio"));
});

test("immagini JPG, PNG, GIF o WebP e allegati di ogni tipo, fino a 10 MB", () => {
  const p = testi.problemi;
  assert.equal(problemaImmagine({ name: "a.png", type: "image/png", size: 10 }), "");
  assert.equal(problemaImmagine({ name: "foto.JPG", type: "", size: 10 }), "");
  assert.equal(problemaImmagine({ name: "a.svg", type: "image/svg+xml", size: 10 }), p.immagine);
  assert.equal(problemaImmagine({ name: "a.pdf", type: "application/pdf", size: 10 }), p.immagine);
  assert.equal(problemaImmagine(null), p.immagine);
  assert.equal(problemaImmagine({ name: "a.png", type: "image/png", size: MAX_BYTE_FILE_NOTIZIA + 1 }), p.troppoGrande("a.png"));
  assert.equal(problemaAllegato({ name: "Circolare.docx", type: "", size: 10 }), "");
  assert.equal(problemaAllegato({ name: "vuoto.pdf", type: "application/pdf", size: 0 }), p.vuoto("vuoto.pdf"));
  assert.equal(problemaAllegato({ name: "a.pdf", type: "", size: MAX_BYTE_FILE_NOTIZIA }), "");
});

test("il nome del file scaricato viene da Content-Disposition, prima filename*", () => {
  assert.equal(nomeDaIntestazione("attachment; filename=\"Circolare.pdf\"; filename*=UTF-8''Circolare%20%C3%A8.pdf", "x"),
    "Circolare è.pdf");
  assert.equal(nomeDaIntestazione("attachment; filename=\"Circolare.pdf\"", "x"), "Circolare.pdf");
  assert.equal(nomeDaIntestazione(null, "ripiego.pdf"), "ripiego.pdf");
});

test("salvataggio: prima la notizia, poi immagine e allegati; un file che non va non ferma gli altri", async () => {
  salvaSessione({ utente_id: 1, ruolo_codice: "nazionale", csrf_token: "a".repeat(64) });
  const immagine = { name: "foto.png", type: "image/png", size: 3 };
  const allegati = [{ name: "Circolare ottobre.pdf", type: "application/pdf", size: 3 }, { name: "b.pdf", type: "", size: 3 }];
  risposte.push(json({ notizia_id: 9 }, 201), json({ notizia_id: 9 }), json({ notizia_allegato_id: 1 }, 201),
    json({ detail: "Il file supera i 10 MB." }, 413));
  const esito = await salvaNotizia({
    modulo: { ...moduloVuoto(CATEGORIE), titolo: "T", testo: "X" },
    immagine: { nuova: immagine }, allegati: { nuovi: allegati },
  });
  assert.deepEqual(esito, { id: 9, errori: ["b.pdf: Il file supera i 10 MB."] });
  const [notizia, foto, primo, secondo] = richieste;
  assert.ok(notizia.url.endsWith("/notizie/") && notizia.method === "POST");
  assert.equal(JSON.parse(notizia.body).notizia_titolo, "T");
  assert.ok(foto.url.endsWith("/notizie/9/immagine") && foto.method === "PUT");
  assert.equal(foto.headers["Content-Type"], "image/png");
  assert.equal(foto.headers["X-CSRF-Token"], "a".repeat(64));
  assert.ok(primo.url.endsWith("/notizie/9/allegati") && primo.method === "POST");
  assert.equal(primo.headers["X-Nome-File"], "Circolare%20ottobre.pdf");
  assert.equal(secondo.headers["Content-Type"], "application/octet-stream");
});

test("modifica: si toglie l'immagine e un allegato; se la notizia non si salva, nessun file parte", async () => {
  salvaSessione({ utente_id: 1, ruolo_codice: "nazionale", csrf_token: "a".repeat(64) });
  const modulo = { ...moduloVuoto(CATEGORIE), titolo: "T", testo: "X" };
  risposte.push(json({ notizia_id: 4 }), vuota(), vuota());
  const esito = await salvaNotizia({
    id: 4, modulo, immagine: { togli: true },
    allegati: { togli: [{ notizia_allegato_id: 6, notizia_allegato_nome_file: "a.pdf" }] },
  });
  assert.deepEqual(esito, { id: 4, errori: [] });
  assert.deepEqual(richieste.map((r) => [r.method, r.url.replace(/^.*?\/notizie/, "/notizie")]),
    [["PUT", "/notizie/4"], ["DELETE", "/notizie/4/immagine"], ["DELETE", "/notizie/4/allegati/6"]]);

  richieste.length = 0;
  risposte.push(json({ detail: "Solo il Nazionale può modificare le notizie." }, 403));
  await assert.rejects(salvaNotizia({ id: 4, modulo, allegati: { nuovi: [{ name: "a.pdf", size: 1 }] } }),
    /Solo il Nazionale/);
  assert.equal(richieste.length, 1);
});

// Sorgenti letti come testo (i test non importano .jsx).
test("le pagine di nuova notizia, scheda e modifica sono collegate alle loro rotte", () => {
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /path=\{PERCORSI\.notizie\.nuovo\} element=\{<ModuloNotizia \/>\}/);
  assert.match(app, /path=\{PERCORSI\.notizie\.modello\} element=\{<SchedaNotizia \/>\}/);
  assert.match(app, /path=\{PERCORSI\.notizie\.modificaModello\} element=\{<ModuloNotizia \/>\}/);
});

test("il pannello dei gruppi prende il display solo da aperto, cosi' chiuso resta nascosto", () => {
  const css = readFileSync(new URL("../src/config/styles/notizie.css", import.meta.url), "utf8");
  const base = css.match(/\.notizie-gruppi__pannello \{([^}]*)\}/)?.[1];
  assert.ok(base, "regola del pannello");
  assert.doesNotMatch(base, /\b(grid|flex|block|inline-flex|inline-grid|display)\b/);
  assert.match(css, /\.notizie-gruppi__pannello:popover-open \{[^}]*display: grid/);
  const indice = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
  assert.match(indice, /@import "\.\/config\/styles\/notizie\.css";/);
});
