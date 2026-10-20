import { useEffect, useRef, useState } from "react";
import { caricaElencoEduNews24 } from "../lib/edunews24Api.js";
import { messaggioErroreAltre, messaggioErrorePagina, percorsoSezione } from "../lib/edunews24.js";
import { creaPaginazioneCursore } from "../lib/edunews24Paginazione.js";
import { useAttesaRiprova } from "./useAttesaRiprova.js";

const VUOTO = {
  elementi: [],
  altri: false,
  loading: true,
  errore: null,
  statoErrore: 0,
  attesaSecondi: 0,
  primaCaricata: false,
  quantePrimaPagina: 0,
  lunghezzePagine: [],
  disattivata: false,
  stantio: false,
  aggiornatoIl: null,
  adesso: null,
  ripartito: false,
};

/**
 * Elenco a cursore di una scheda della pagina EduNews24. Lo chiama la pagina,
 * non il pannello, cosi' la richiesta parte al montaggio; un cambio di scheda
 * o di filtro riparte dalla prima pagina.
 *
 * Restituisce lo stato della paginazione (elementi, altri, loading,
 * primaCaricata, lunghezzePagine, disattivata, stantio, aggiornatoIl, adesso,
 * ripartito, statoErrore) piu':
 * - `errore`: testo per StatoPagineElenco ("Carica altri"), senza secondi;
 * - `errorePrimaPagina`: null oppure { testo, azione: "riprova" |
 *   "rimuovi-filtri", nota } per l'AlertMessage del primo caricamento e la
 *   nota accanto a "Riprova" (i secondi solo finche' `bloccato`);
 * - `bloccato` e `attesaSecondi`: "Riprova" del primo caricamento resta
 *   aria-disabled fino a Retry-After;
 * - `carica`: "Carica altri" e "Riprova".
 */
export function usePaginaEduNews24(sezione, filtri, abilitata) {
  const chiave = percorsoSezione(sezione, filtri);
  const [stato, setStato] = useState(null);
  const prossima = useRef(null);
  const { bloccato, iniziali, avvia: avviaAttesa } = useAttesaRiprova();

  useEffect(() => {
    if (!abilitata) return undefined;
    const paginazione = creaPaginazioneCursore({
      richiedi: (cursore, signal) => caricaElencoEduNews24(chiave, cursore, signal),
      pubblica: (nuovo) => {
        setStato({ ...nuovo, chiave });
        if (nuovo.errore) avviaAttesa(nuovo.attesaSecondi);
      },
    });
    prossima.current = paginazione.prossima;
    paginazione.avvia();
    return () => {
      paginazione.annulla();
      prossima.current = null;
    };
  }, [chiave, abilitata, avviaAttesa]);

  const corrente = abilitata && stato?.chiave === chiave ? stato : VUOTO;
  const primoErrore = !corrente.primaCaricata && corrente.errore !== null;
  return {
    elementi: corrente.elementi,
    altri: corrente.altri,
    loading: corrente.loading,
    primaCaricata: corrente.primaCaricata,
    quantePrimaPagina: corrente.quantePrimaPagina,
    lunghezzePagine: corrente.lunghezzePagine,
    disattivata: corrente.disattivata,
    stantio: corrente.stantio,
    aggiornatoIl: corrente.aggiornatoIl,
    adesso: corrente.adesso,
    ripartito: corrente.ripartito,
    statoErrore: corrente.statoErrore,
    errore: corrente.primaCaricata && corrente.errore !== null ? messaggioErroreAltre(corrente.statoErrore) : null,
    errorePrimaPagina: primoErrore
      ? messaggioErrorePagina(sezione, corrente.statoErrore, corrente.attesaSecondi, bloccato)
      : null,
    bloccato: primoErrore && bloccato,
    attesaSecondi: primoErrore && bloccato ? iniziali : 0,
    carica: () => {
      if (primoErrore && bloccato) return;
      prossima.current?.();
    },
  };
}
