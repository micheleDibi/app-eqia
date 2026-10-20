import { useEffect, useState } from "react";
import { caricaStatoMfa } from "../lib/sicurezza.js";

// Stesso schema di useProfilo: l'esito e' legato al tentativo che lo ha
// prodotto, cosi' "ricarica" mostra il caricamento senza scrivere stato
// dentro l'effetto.
export function useSicurezza() {
  const [tentativo, setTentativo] = useState(0);
  const [esito, setEsito] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    caricaStatoMfa(controller.signal).then(
      (stato) => { if (!controller.signal.aborted) setEsito({ tentativo, stato }); },
      (errore) => { if (!controller.signal.aborted) setEsito({ tentativo, errore: errore.message }); },
    );
    return () => controller.abort();
  }, [tentativo]);
  const corrente = esito?.tentativo === tentativo ? esito : null;
  return {
    stato: corrente?.stato,
    errore: corrente?.errore,
    caricamento: !corrente,
    ricarica: () => setTentativo((n) => n + 1),
  };
}
