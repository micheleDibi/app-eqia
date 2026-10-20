import { useSyncExternalStore } from "react";
import { leggiSessione, osservaSessione } from "../lib/sessione.js";

export function useSessione() {
  return useSyncExternalStore(osservaSessione, leggiSessione);
}
