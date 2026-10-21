import { apiFetch, leggiJson } from "./api.js";
import { descriviErrore, ErroreApi } from "./erroriApi.js";
import {
  GRUPPI_NOTIZIA,
  TESTI_GESTIONE_TAG as testiTag,
  TESTI_MODULO_NOTIZIA as testiModulo,
  TESTI_SCHEDA_NOTIZIA as testiScheda,
} from "../config/testi/notizie.js";

// Notizie del Nazionale: le rotte di backend/src/notizie/.
const base = "/notizie";
const notizia = (id) => `${base}/${id}`;

export const LIMITE_NOTIZIE = 20;
export const MAX_BYTE_FILE_NOTIZIA = 10 * 1024 * 1024;
export const TIPI_IMMAGINE = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ESTENSIONI_IMMAGINE = /\.(jpe?g|png|gif|webp)$/i;
const LINK = /^https?:\/\/[^\s/?#]+\S*$/i;
// Il collegamento temporaneo del file scaricato si libera dopo un po':
// alcuni browser leggono il blob dopo il clic.
const ATTESA_REVOCA_MS = 60_000;

/** L'indirizzo della prima pagina dell'elenco, con i filtri per sezione ("" se
 * non scelta) e argomenti (elenco di id, valgono solo con la sezione: le
 * notizie con almeno uno); usePagineRemote aggiunge skip. */
export function queryNotizie(limite = LIMITE_NOTIZIE, { tag = "", sottotag = [] } = {}) {
  const parametri = new URLSearchParams({ limit: limite });
  if (tag) {
    parametri.set("tag_id", tag);
    for (const s of sottotag) parametri.append("tag_dettaglio_id", s);
  }
  return `${base}/?${parametri}`;
}

/** Il filtro dopo un clic sull'argomento `sottotag` (id come testo) della
 * sezione `categoria`: lo aggiunge o lo toglie, nell'ordine degli argomenti;
 * senza argomenti resta tutta la sezione. Con un'altra sezione si riparte da zero. */
export function filtroConSottotag(filtri, categoria, sottotag) {
  const tag = String(categoria.tag_id);
  const prima = filtri.tag === tag ? filtri.sottotag : [];
  const scelti = prima.includes(sottotag) ? prima.filter((s) => s !== sottotag) : [...prima, sottotag];
  return { tag, sottotag: categoria.sottotag.map((s) => String(s.tag_dettaglio_id)).filter((s) => scelti.includes(s)) };
}

/** Gli argomenti della sezione scelta nel filtro, o nessuno se non c'e' sezione. */
export function sottotagDelTag(categorie, tag) {
  return categorie.find((c) => String(c.tag_id) === String(tag))?.sottotag ?? [];
}

/** Una pagina dell'elenco per usePagineRemote: `id` per non ripetere le righe. */
export const paginaNotizie = (dati) => ({
  elementi: dati.map((riga) => ({ ...riga, id: riga.notizia_id })),
  altri: dati.length === LIMITE_NOTIZIE,
});

/** "2026-10-16T11:30:00" -> "16/10/2026". */
export function dataNotizia(valore) {
  const [anno, mese, giorno] = String(valore || "").slice(0, 10).split("-");
  return anno && mese && giorno ? `${giorno}/${mese}/${anno}` : "";
}

/** Quante notizie mostra al massimo il riquadro della Dashboard, e di quanti giorni. */
export const NOTIZIE_DASHBOARD = 3;
export const GIORNI_DASHBOARD = 30;

/** Le notizie del riquadro della Dashboard, da quelle piu' recenti (gia' in
 * ordine, al massimo NOTIZIE_DASHBOARD): quelle degli ultimi 30 giorni; se
 * non ce n'e' nessuna, la sola piu' recente, di qualunque data. Senza
 * notizie, nessuna. Una notizia senza data conta come vecchia. */
export function notizieDashboard(righe, adesso = new Date()) {
  const limite = adesso.getTime() - GIORNI_DASHBOARD * 24 * 60 * 60 * 1000;
  const recenti = righe.slice(0, NOTIZIE_DASHBOARD).filter((riga) => {
    const data = riga.notizia_created_at ? new Date(riga.notizia_created_at).getTime() : Number.NaN;
    return data >= limite;
  });
  return recenti.length ? recenti : righe.slice(0, 1);
}

/** La riga sotto il titolo: il riassunto, o il sottotitolo se manca. */
export function sommarioNotizia(riga) {
  return (riga.notizia_riassunto || "").trim() || (riga.notizia_sottotitolo || "").trim();
}

/** "Tutti i gruppi", "Nessun gruppo" o i gruppi scelti, nell'ordine della tendina.
 * `tutti` sostituisce "Tutti i gruppi" (in fondo alla scheda: "Tutti gli attuatori"). */
export function testoGruppi(scelti, { tutti = testiModulo.destinatari.tutti } = {}) {
  const t = testiModulo.destinatari;
  const etichette = GRUPPI_NOTIZIA.filter((g) => scelti.includes(g.valore)).map((g) => g.etichetta);
  if (etichette.length === 0) return t.nessuno;
  if (etichette.length === GRUPPI_NOTIZIA.length) return tutti;
  return etichette.join(", ");
}

// =============================================================================
// Modulo
// =============================================================================

/** Il modulo di una notizia nuova: la prima sezione dell'elenco, nessun
 * argomento, tutti i gruppi. */
export function moduloVuoto(categorie = []) {
  return {
    titolo: "", sottotitolo: "", riassunto: "", testo: "", link: "",
    categoria: categorie.length ? String(categorie[0].tag_id) : "",
    sottotag: [],
    gruppi: GRUPPI_NOTIZIA.map((g) => g.valore),
  };
}

/** Il modulo dalla scheda di una notizia da modificare, con la sua sezione e
 * i suoi argomenti anche se nel frattempo disattivati (opzioniTag). */
export function moduloDaScheda(scheda) {
  return {
    titolo: scheda.notizia_titolo ?? "",
    sottotitolo: scheda.notizia_sottotitolo ?? "",
    riassunto: scheda.notizia_riassunto ?? "",
    testo: scheda.notizia_descrizione ?? "",
    link: scheda.notizia_url ?? "",
    categoria: scheda.tag_id ? String(scheda.tag_id) : "",
    sottotag: (scheda.sottotag ?? []).map((s) => s.tag_dettaglio_id),
    gruppi: GRUPPI_NOTIZIA.map((g) => g.valore).filter((g) => (scheda.gruppi ?? []).includes(g)),
  };
}

/** Le sezioni del modulo: quelle attive e, modificando, anche quella della
 * notizia se nel frattempo e' stata disattivata. */
export function opzioniTag(categorie, scheda = null) {
  const opzioni = categorie.map((c) => ({ valore: String(c.tag_id), etichetta: c.tag_descrizione }));
  if (scheda?.tag_id && !categorie.some((c) => c.tag_id === scheda.tag_id)) {
    opzioni.push({ valore: String(scheda.tag_id), etichetta: scheda.tag_descrizione ?? "" });
  }
  return opzioni;
}

/** Gli argomenti sceglibili per la sezione `tag`: quelli attivi e,
 * modificando con la stessa sezione, anche quelli della notizia disattivati. */
export function opzioniSottotag(categorie, tag, scheda = null) {
  const opzioni = sottotagDelTag(categorie, tag)
    .map((s) => ({ valore: s.tag_dettaglio_id, etichetta: s.tag_dettaglio_descrizione }));
  if (scheda && String(scheda.tag_id) === String(tag)) {
    for (const s of scheda.sottotag ?? []) {
      if (!opzioni.some((o) => o.valore === s.tag_dettaglio_id)) {
        opzioni.push({ valore: s.tag_dettaglio_id, etichetta: s.tag_dettaglio_descrizione });
      }
    }
  }
  return opzioni;
}

/** Il testo della tendina degli argomenti: "Nessuno" o i nomi scelti, nell'ordine delle opzioni. */
export function testoSottotag(scelti, opzioni) {
  const nomi = opzioni.filter((o) => scelti.includes(o.valore)).map((o) => o.etichetta);
  return nomi.length ? nomi.join(", ") : testiModulo.contenuto.nessunSottotag;
}

/** Spunta o toglie un valore, tenendo l'ordine delle opzioni. */
export function alternaScelta(scelti, valore, opzioni) {
  const nuovi = scelti.includes(valore) ? scelti.filter((v) => v !== valore) : [...scelti, valore];
  return opzioni.map((o) => o.valore).filter((v) => nuovi.includes(v));
}

/** Il corpo di POST /notizie/ e PUT /notizie/{id}, con i nomi delle colonne.
 * Partono solo i gruppi della tendina di oggi. */
export function payloadNotizia(modulo) {
  return {
    notizia_titolo: modulo.titolo.trim(),
    notizia_sottotitolo: modulo.sottotitolo.trim(),
    notizia_riassunto: modulo.riassunto.trim(),
    notizia_descrizione: modulo.testo.trim(),
    notizia_url: modulo.link.trim(),
    tag_id: Number(modulo.categoria),
    sottotag: modulo.sottotag,
    gruppi: GRUPPI_NOTIZIA.map((g) => g.valore).filter((g) => modulo.gruppi.includes(g)),
  };
}

export function linkValido(testo) {
  const link = (testo ?? "").trim();
  return link === "" || LINK.test(link);
}

/** Il primo problema del modulo, o "" se si puo' salvare. Gli stessi
 * controlli li ripete il server. */
export function problemaModulo(modulo) {
  const p = testiModulo.problemi;
  if (!modulo.titolo.trim()) return p.titolo;
  if (!modulo.testo.trim()) return p.testo;
  if (!linkValido(modulo.link)) return p.link;
  if (!modulo.categoria) return p.categoria;
  if (!GRUPPI_NOTIZIA.some((g) => modulo.gruppi.includes(g.valore))) return p.gruppi;
  return "";
}

function problemaDimensione(file) {
  const p = testiModulo.problemi;
  if (file.size === 0) return p.vuoto(file.name);
  if (file.size > MAX_BYTE_FILE_NOTIZIA) return p.troppoGrande(file.name);
  return "";
}

/** "" se il file si puo' caricare come immagine della notizia. */
export function problemaImmagine(file) {
  if (!file) return testiModulo.problemi.immagine;
  const immagine = TIPI_IMMAGINE.includes(file.type) || (!file.type && ESTENSIONI_IMMAGINE.test(file.name || ""));
  if (!immagine) return testiModulo.problemi.immagine;
  return problemaDimensione(file);
}

/** "" se il file si puo' allegare: qualunque tipo, fino a 10 MB. */
export function problemaAllegato(file) {
  return problemaDimensione(file);
}

// =============================================================================
// API
// =============================================================================

async function json(risposta, errore) {
  const dati = await leggiJson(risposta);
  if (!risposta.ok) throw new ErroreApi(descriviErrore(risposta, dati, errore), risposta.status);
  return dati;
}

export async function leggiNotizie({ limite = LIMITE_NOTIZIE, signal } = {}) {
  return json(await apiFetch(queryNotizie(limite), { signal, cache: "no-store" }), testiScheda.erroreLettura);
}

export async function leggiNotizia(id, signal) {
  return json(await apiFetch(notizia(id), { signal, cache: "no-store" }), testiScheda.erroreLettura);
}

export async function leggiCategorie(signal) {
  return json(await apiFetch(`${base}/categorie`, { signal, cache: "no-store" }), testiModulo.erroreLettura);
}

// Gestione di sezioni e argomenti (solo Nazionale): ogni chiamata risponde
// con l'elenco completo, anche dei disattivati (backend/src/notizie/tag.py).

export async function leggiTag(signal) {
  return json(await apiFetch(`${base}/tag`, { signal, cache: "no-store" }), testiTag.erroreLettura);
}

const invia = async (percorso, metodo, corpo) =>
  json(await apiFetch(percorso, { method: metodo, body: JSON.stringify(corpo) }), testiTag.erroreSalvataggio);

export const aggiungiTag = (nome) => invia(`${base}/tag`, "POST", { nome });
export const aggiungiSottotag = (tagId, nome) => invia(`${base}/tag/${tagId}/sottotag`, "POST", { nome });
export const statoTag = (tagId, attivo) => invia(`${base}/tag/${tagId}/stato`, "PUT", { attivo });
export const statoSottotag = (sottotagId, attivo) => invia(`${base}/sottotag/${sottotagId}/stato`, "PUT", { attivo });

export async function eliminaNotizia(id) {
  const risposta = await apiFetch(notizia(id), { method: "DELETE" });
  if (!risposta.ok) await json(risposta, testiScheda.erroreEliminazione);
}

/** L'immagine come Blob, da mostrare con un indirizzo blob: la richiesta
 * porta la sessione, che un <img> verso l'API non avrebbe sempre. */
export async function leggiImmagine(id, signal) {
  const risposta = await apiFetch(`${notizia(id)}/immagine`, { signal, cache: "no-store" });
  if (!risposta.ok) await json(risposta, testiScheda.erroreLettura);
  return risposta.blob();
}

/** Il nome del file da Content-Disposition (filename* prima di filename), o il ripiego. */
export function nomeDaIntestazione(intestazione, ripiego) {
  const esteso = /filename\*=UTF-8''([^;]+)/i.exec(intestazione ?? "");
  if (esteso) {
    try { return decodeURIComponent(esteso[1].trim()); } catch { /* si prova con filename */ }
  }
  const semplice = /filename="?([^";]+)"?/i.exec(intestazione ?? "");
  return semplice?.[1]?.trim() || ripiego;
}

/** Salva sul dispositivo il corpo di una risposta, con il nome indicato dal server. */
async function salvaFile(risposta, ripiego, ambiente) {
  const nome = nomeDaIntestazione(risposta.headers.get("Content-Disposition"), ripiego);
  const indirizzo = ambiente.URL.createObjectURL(await risposta.blob());
  const collegamento = ambiente.document.createElement("a");
  collegamento.href = indirizzo;
  collegamento.download = nome;
  ambiente.document.body.append(collegamento);
  collegamento.click();
  collegamento.remove();
  ambiente.setTimeout(() => ambiente.URL.revokeObjectURL(indirizzo), ATTESA_REVOCA_MS);
  return nome;
}

export async function scaricaAllegato(id, allegato, ambiente = globalThis) {
  const risposta = await apiFetch(`${notizia(id)}/allegati/${allegato.notizia_allegato_id}`, { cache: "no-store" });
  if (!risposta.ok) await json(risposta, testiScheda.erroreScarica);
  return salvaFile(risposta, allegato.notizia_allegato_nome_file, ambiente);
}

async function caricaFile(url, metodo, file) {
  const risposta = await apiFetch(url, {
    method: metodo,
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream", "X-Nome-File": encodeURIComponent(file.name) },
  });
  return json(risposta, testiModulo.erroreSalvataggio);
}

async function togli(url) {
  const risposta = await apiFetch(url, { method: "DELETE" });
  if (!risposta.ok) await json(risposta, testiModulo.erroreSalvataggio);
}

/**
 * Salva la notizia e poi i suoi file, uno alla volta:
 * - `id` nullo crea la notizia, altrimenti la modifica;
 * - `immagine.nuova` (File) la carica o la sostituisce, `immagine.togli` la toglie;
 * - `allegati.togli` (righe) li toglie, `allegati.nuovi` (File) li carica.
 *
 * Se la notizia non si salva, l'errore si propaga e non si tocca nessun
 * file. Se si salva, un file che non va non ferma gli altri: l'id torna con
 * l'elenco dei file non riusciti (`errori`), per dirlo nella scheda.
 */
export async function salvaNotizia({ id = null, modulo, immagine = {}, allegati = {} }) {
  const corpo = JSON.stringify(payloadNotizia(modulo));
  const risposta = id === null
    ? await apiFetch(`${base}/`, { method: "POST", body: corpo })
    : await apiFetch(notizia(id), { method: "PUT", body: corpo });
  const scheda = await json(risposta, testiModulo.erroreSalvataggio);
  const notiziaId = scheda.notizia_id;
  const errori = [];
  const prova = async (nome, azione) => {
    try {
      await azione();
    } catch (errore) {
      errori.push(`${nome}: ${errore.message}`);
    }
  };
  if (immagine.nuova) {
    await prova(testiModulo.fileImmagine, () => caricaFile(`${notizia(notiziaId)}/immagine`, "PUT", immagine.nuova));
  } else if (immagine.togli) {
    await prova(testiModulo.fileImmagine, () => togli(`${notizia(notiziaId)}/immagine`));
  }
  for (const allegato of allegati.togli ?? []) {
    await prova(allegato.notizia_allegato_nome_file,
      () => togli(`${notizia(notiziaId)}/allegati/${allegato.notizia_allegato_id}`));
  }
  for (const file of allegati.nuovi ?? []) {
    await prova(file.name, () => caricaFile(`${notizia(notiziaId)}/allegati`, "POST", file));
  }
  return { id: notiziaId, errori };
}
