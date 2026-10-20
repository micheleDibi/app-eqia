// Chiamate alle rotte EduNews24 del backend e registro dell'esito della
// funzione (attiva, disattivata o ancora ignota) per la vita della pagina.
import { apiFetch, leggiJson } from "./api.js";
import { ErroreApi } from "./erroriApi.js";
import {
  conCursore,
  erroreEduNews24,
  leggiRispostaCategorie,
  leggiRispostaElenco,
  percorsoCategorie,
} from "./edunews24.js";
import { TESTI_EDUNEWS24 as testi } from "../config/testi/edunews24.js";

// Registro sul modello di lib/sessione.js: la Dashboard non monta il modulo
// finche' l'esito e' ignoto, e non lo mostra piu' se e' "disattivata".
let esito = "ignota";
const osservatori = new Set();

function pubblicaEsito(valore) {
  if (valore === esito) return;
  esito = valore;
  osservatori.forEach((osservatore) => osservatore());
}

export function leggiEsitoFunzione() { return esito; }

export function osservaEsitoFunzione(osservatore) {
  osservatori.add(osservatore);
  return () => osservatori.delete(osservatore);
}

/** Solo per i test. */
export function azzeraEsitoFunzione() { pubblicaEsito("ignota"); }

// Il messaggio e' generico: i testi mostrati si compongono secondo il contesto
// da `stato` e `attesaSecondi` (lib/edunews24.js).
const MESSAGGI = { cursore: testi.cursore, richiesta: testi.filtroNonValido };

function errore(tipo, stato, attesaSecondi = 0) {
  const eccezione = new ErroreApi(MESSAGGI[tipo] ?? testi.erroreModulo, stato, attesaSecondi);
  eccezione.tipo = tipo;
  return eccezione;
}

async function richiedi(percorso, signal) {
  let risposta;
  try {
    risposta = await apiFetch(percorso, { signal, cache: "no-store" });
  } catch (eccezione) {
    // Il 401 risale cosi' com'e' (apiFetch porta gia' al login); un
    // annullamento lo riconosce il chiamante da signal.aborted.
    if (eccezione instanceof ErroreApi && eccezione.stato === 0 && !signal?.aborted) throw errore("rete", 0);
    throw eccezione;
  }
  if (!risposta.ok) {
    const { tipo, attesaSecondi } = erroreEduNews24(risposta.status, risposta.headers.get("Retry-After"));
    throw errore(tipo, risposta.status, attesaSecondi);
  }
  const dati = await leggiJson(risposta);
  if (dati === null) throw errore("risposta", risposta.status);
  return { dati, stato: risposta.status };
}

/**
 * Una pagina di notizie, interpelli o selezione: { attiva, elementi, cursore,
 * stantio, aggiornatoIl, ricevutoIl }. `ricevutoIl` viene da `orologio`.
 */
export async function caricaElencoEduNews24(percorso, cursore, signal, orologio = Date.now) {
  const { dati, stato } = await richiedi(conCursore(percorso, cursore), signal);
  let letta;
  try {
    letta = leggiRispostaElenco(dati);
  } catch {
    throw errore("risposta", stato);
  }
  pubblicaEsito(letta.attiva ? "attiva" : "disattivata");
  return { ...letta, ricevutoIl: orologio() };
}

/** Categorie delle notizie: { attiva, categorie, stantio }. */
export async function caricaCategorieEduNews24(signal) {
  const { dati, stato } = await richiedi(percorsoCategorie(), signal);
  let lette;
  try {
    lette = leggiRispostaCategorie(dati);
  } catch {
    throw errore("risposta", stato);
  }
  pubblicaEsito(lette.attiva ? "attiva" : "disattivata");
  return lette;
}
