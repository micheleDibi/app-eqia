import { useEffect, useState } from "react";
import { RITARDO_SCHELETRO_MS } from "../config/edunews24.js";

/**
 * Vero dopo RITARDO_SCHELETRO_MS dall'ultima `chiave`, subito con `subito`:
 * uno scheletro che non lampeggia quando la risposta arriva in fretta o
 * quando la funzione e' spenta. Va chiamato sempre, mai dentro una condizione.
 */
export function useComparsaRitardata(chiave, subito) {
  const [scaduta, setScaduta] = useState(null);
  useEffect(() => {
    if (subito) return undefined;
    const timer = setTimeout(() => setScaduta(chiave), RITARDO_SCHELETRO_MS);
    return () => clearTimeout(timer);
  }, [chiave, subito]);
  return subito || scaduta === chiave;
}
