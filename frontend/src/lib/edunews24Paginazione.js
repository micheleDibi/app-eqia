// Paginazione a cursore della pagina EduNews24, senza React: la usa
// usePaginaEduNews24 e si prova con node --test.
import { deduplicaVoci } from "./edunews24.js";
import { TESTI_EDUNEWS24 as testi } from "../config/testi/edunews24.js";

/**
 * `richiedi(cursore, signal)` restituisce una pagina come caricaElencoEduNews24;
 * `pubblica(stato)` riceve ogni volta lo stato completo:
 * { elementi, altri, loading, errore, statoErrore, attesaSecondi, primaCaricata,
 *   quantePrimaPagina, lunghezzePagine, disattivata, stantio, aggiornatoIl,
 *   adesso, ripartito }.
 * `lunghezzePagine` ha una voce per pagina, contata dopo la deduplica.
 * Al primo 409 (elenco cambiato a monte) si riparte una volta sola dalla prima
 * pagina; al secondo si pubblica l'errore e "Riprova" riparte da capo.
 */
export function creaPaginazioneCursore({ richiedi, pubblica, orologio = Date.now }) {
  const controller = new AbortController();
  let elementi = [];
  let lunghezzePagine = [];
  let cursore = null;
  let altri = false;
  let primaCaricata = false;
  let quantePrimaPagina = 0;
  let adesso = null;
  let stantio = false;
  let aggiornatoIl = null;
  let disattivata = false;
  let ripartito = false;
  let riparti = false;
  let occupato = false;
  let errore = null;
  let statoErrore = 0;
  let attesaSecondi = 0;

  const stato = (loading = false) => ({
    elementi, altri, loading, errore, statoErrore, attesaSecondi, primaCaricata, quantePrimaPagina,
    lunghezzePagine, disattivata, stantio, aggiornatoIl, adesso, ripartito,
  });

  function azzera() {
    elementi = [];
    lunghezzePagine = [];
    cursore = null;
    altri = false;
    primaCaricata = false;
    quantePrimaPagina = 0;
    adesso = null;
    stantio = false;
    aggiornatoIl = null;
  }

  function azzeraErrore() {
    errore = null;
    statoErrore = 0;
    attesaSecondi = 0;
  }

  // L'istante piu' vecchio fra quelli delle pagine caricate: il folio non
  // promette un aggiornamento piu' recente di quello di ogni pagina.
  function piuVecchio(attuale, nuovo) {
    if (nuovo === null) return attuale;
    if (attuale === null) return nuovo;
    return Date.parse(nuovo) < Date.parse(attuale) ? nuovo : attuale;
  }

  function accoda(pagina) {
    azzeraErrore();
    if (pagina.attiva === false) {
      disattivata = true;
      altri = false;
      pubblica(stato());
      return;
    }
    const unite = deduplicaVoci(elementi, pagina.elementi);
    const nuove = unite.length - elementi.length;
    if (!primaCaricata) {
      adesso = orologio();
      quantePrimaPagina = nuove;
    }
    elementi = unite;
    lunghezzePagine = [...lunghezzePagine, nuove];
    cursore = pagina.cursore ?? null;
    altri = cursore !== null;
    stantio = stantio || pagina.stantio === true;
    aggiornatoIl = piuVecchio(aggiornatoIl, pagina.aggiornatoIl ?? null);
    primaCaricata = true;
    pubblica(stato());
  }

  // Restituisce true quando serve ripartire subito dalla prima pagina.
  function gestisci(eccezione) {
    if (eccezione?.stato === 401) return false;
    if (eccezione?.stato === 409 && primaCaricata && !ripartito) {
      ripartito = true;
      azzera();
      azzeraErrore();
      pubblica(stato(true));
      return true;
    }
    if (eccezione?.stato === 409) riparti = true;
    errore = eccezione?.message || testi.erroreModulo;
    statoErrore = eccezione?.stato ?? 0;
    attesaSecondi = eccezione?.attesaSecondi ?? 0;
    pubblica(stato());
    return false;
  }

  async function carica() {
    if (occupato || controller.signal.aborted) return;
    occupato = true;
    let ripartenza = false;
    try {
      const pagina = await richiedi(primaCaricata ? cursore : null, controller.signal);
      if (!controller.signal.aborted) accoda(pagina);
    } catch (eccezione) {
      if (!controller.signal.aborted) ripartenza = gestisci(eccezione);
    } finally {
      occupato = false;
    }
    // Fuori dal try: un `return carica()` nel try farebbe azzerare `occupato`
    // dal finally mentre la ripartenza e' in corso.
    if (ripartenza) await carica();
  }

  /** Prima pagina, senza pubblicare nulla in modo sincrono. */
  function avvia() {
    if (occupato || primaCaricata || disattivata || controller.signal.aborted) return Promise.resolve();
    return carica();
  }

  /** "Carica altri" e "Riprova": dopo il secondo 409 riparte dalla prima pagina. */
  function prossima() {
    if (occupato || disattivata || controller.signal.aborted) return Promise.resolve();
    if (riparti) {
      riparti = false;
      azzera();
    } else if (primaCaricata && !altri) {
      return Promise.resolve();
    }
    azzeraErrore();
    pubblica(stato(true));
    return carica();
  }

  return { avvia, prossima, annulla: () => controller.abort() };
}
