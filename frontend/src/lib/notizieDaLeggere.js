// Notizie da leggere: il numero sulla voce Notizie del menu. Il numero si
// rilegge a intervalli solo con la scheda del browser in vista, a ogni cambio
// di utente e quando si apre una notizia; nessuna socket. All'import non si
// tocca document ne' window: l'istanza predefinita nasce al primo uso. Il
// pallino sulla singola notizia viene invece dall'elenco (`letta`,
// backend/src/notizie/dati.py).
import { apiFetch, leggiJson, messaggioErrore } from "./api.js";
import { ErroreApi } from "./erroriApi.js";
import { leggiSessione, osservaSessione } from "./sessione.js";
import { ROTTE, vociMenuPerRuolo } from "../config/routes/rotte.js";
import { TESTI_NOTIZIE_DA_LEGGERE } from "../config/testi/notizie.js";

/** Ogni quanto si rilegge il numero, con la scheda in vista. */
export const INTERVALLO_NOTIZIE_DA_LEGGERE_MS = 60_000;

const intero = (valore) => (Number.isInteger(valore) && valore >= 0 ? valore : 0);

/** Quante notizie l'utente non ha ancora aperto: `{ totale }`. */
export async function leggiNotizieDaLeggere({ signal } = {}) {
  const risposta = await apiFetch("/notizie/da-leggere", { cache: "no-store", signal });
  if (!risposta.ok) throw new ErroreApi(await messaggioErrore(risposta), risposta.status);
  const dati = await leggiJson(risposta);
  return { totale: intero(dati?.totale) };
}

// Si interroga il server solo se il ruolo vede la voce Notizie.
function vedeNotizie(sessione) {
  return vociMenuPerRuolo(sessione.ruoloCodice).some((voce) => voce.rotta === ROTTE.notizie);
}

/**
 * Archivio del conteggio, con le dipendenze iniettate (testabile in Node).
 * Il primo iscritto avvia il poll, l'ultimo che esce lo ferma.
 * `snapshot()` resta lo stesso oggetto finche' il totale non cambia; allora
 * `versione` cresce di uno.
 */
export function creaArchivioNotizieDaLeggere({
  leggi = leggiNotizieDaLeggere,
  intervalloMs = INTERVALLO_NOTIZIE_DA_LEGGERE_MS,
  documento,
  leggiSessione: sessioneAttuale = leggiSessione,
  osservaSessione: osservaCambiSessione = osservaSessione,
  abilitato = vedeNotizie,
} = {}) {
  const iscritti = new Set();
  let valore = Object.freeze({ totale: 0, versione: 0 });
  // Cresce a ogni azzeramento: le risposte di una generazione vecchia si scartano.
  let generazione = 0;
  let inCorso = null;
  // Rilettura chiesta durante una lettura: al massimo una, dopo quella in corso.
  let inCoda = null;
  let utente = sessioneAttuale()?.utenteId ?? null;
  let intervallo = null;
  let smettiSessione = null;

  const visibile = () => !documento || documento.visibilityState === "visible";

  // Senza dati il totale torna a 0.
  function imposta(dati) {
    const totale = intero(dati?.totale);
    if (totale === valore.totale) return;
    valore = Object.freeze({ totale, versione: valore.versione + 1 });
    iscritti.forEach((iscritto) => iscritto());
  }

  function interrompi() {
    generazione += 1;
    inCorso?.controllore.abort();
    inCorso = null;
  }

  // Sessione chiusa o di un altro utente: si riparte da zero.
  function controllaUtente() {
    const id = sessioneAttuale()?.utenteId ?? null;
    if (id === utente) return false;
    utente = id;
    interrompi();
    imposta();
    return true;
  }

  // Lettura del totale, oppure quella gia' in corso.
  function leggiSubito() {
    controllaUtente();
    if (inCorso) return inCorso.promessa;
    const sessione = sessioneAttuale();
    if (!sessione || !abilitato(sessione)) {
      imposta();
      return Promise.resolve();
    }
    const mia = generazione;
    const controllore = new AbortController();
    let richiesta;
    try {
      richiesta = Promise.resolve(leggi({ signal: controllore.signal }));
    } catch (errore) {
      richiesta = Promise.reject(errore);
    }
    const promessa = richiesta
      .then((dati) => {
        if (mia === generazione) imposta(dati);
      })
      // Errori silenziosi: resta l'ultimo valore (il 401 lo gestisce apiFetch).
      .catch(() => {})
      .finally(() => {
        if (inCorso?.promessa === promessa) inCorso = null;
      });
    inCorso = { promessa, controllore };
    return promessa;
  }

  // Rilettura chiesta da fuori (notizia appena aperta). Se una lettura e' in
  // corso puo' essere partita prima: finita quella, se ne fa una sola in piu',
  // condivisa da chi chiama nel frattempo.
  function aggiorna() {
    controllaUtente();
    if (!inCorso) return leggiSubito();
    if (!inCoda) {
      inCoda = inCorso.promessa.then(() => {
        inCoda = null;
        return leggiSubito();
      });
    }
    return inCoda;
  }

  function programma() {
    if (intervallo !== null || !visibile()) return;
    intervallo = setInterval(leggiSubito, intervalloMs);
  }

  function sospendi() {
    if (intervallo === null) return;
    clearInterval(intervallo);
    intervallo = null;
  }

  function alCambioVisibilita() {
    if (!visibile()) {
      sospendi();
      return;
    }
    leggiSubito();
    programma();
  }

  function alCambioSessione() {
    if (controllaUtente() && utente !== null && visibile()) leggiSubito();
  }

  function avvia() {
    smettiSessione = osservaCambiSessione?.(alCambioSessione) ?? null;
    documento?.addEventListener?.("visibilitychange", alCambioVisibilita);
    if (visibile()) leggiSubito();
    programma();
  }

  function ferma() {
    sospendi();
    documento?.removeEventListener?.("visibilitychange", alCambioVisibilita);
    smettiSessione?.();
    smettiSessione = null;
    interrompi();
  }

  function subscribe(iscritto) {
    iscritti.add(iscritto);
    if (iscritti.size === 1) avvia();
    return () => {
      if (!iscritti.delete(iscritto)) return;
      if (iscritti.size === 0) ferma();
    };
  }

  return { subscribe, snapshot: () => valore, aggiorna };
}

let predefinito = null;

/** Istanza dell'applicazione, creata al primo uso. */
export function archivioNotizieDaLeggere() {
  predefinito ??= creaArchivioNotizieDaLeggere({
    documento: globalThis.document,
    leggiSessione,
    osservaSessione,
  });
  return predefinito;
}

/** Rilegge il conteggio: notizia appena aperta. */
export function aggiornaNotizieDaLeggere() {
  return archivioNotizieDaLeggere().aggiorna();
}

/** Numero del contatore: vuoto con 0, poi "1"…"99" e "99+". */
export function etichettaContatore(n) {
  return Number.isInteger(n) && n > 0 ? TESTI_NOTIZIE_DA_LEGGERE.contatore(n) : "";
}
