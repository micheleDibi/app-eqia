import { useSyncExternalStore } from "react";
import { leggiEsitoFunzione, osservaEsitoFunzione } from "../lib/edunews24Api.js";

/**
 * Esito della funzione EduNews24 per la vita della pagina: "ignota" finche'
 * nessuna risposta e' arrivata, poi "attiva" o "disattivata".
 */
export function useEsitoFunzioneEduNews24() {
  return useSyncExternalStore(osservaEsitoFunzione, leggiEsitoFunzione, leggiEsitoFunzione);
}
