import { useSyncExternalStore } from "react";
import { archivioNotizieDaLeggere } from "../lib/notizieDaLeggere.js";

/**
 * Notizie da leggere dell'utente, per il numero sulla voce del menu:
 * `{ totale, versione }`. `versione` cresce solo quando cambia il totale.
 */
export function useNotizieDaLeggere() {
  const archivio = archivioNotizieDaLeggere();
  return useSyncExternalStore(archivio.subscribe, archivio.snapshot);
}
