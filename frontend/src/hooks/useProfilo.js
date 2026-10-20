import { useEffect, useState } from "react";
import { useSessione } from "./useSessione.js";
import { caricaProfilo } from "../lib/profilo.js";

export function useProfilo() {
  const sessione = useSessione();
  const [tentativo, setTentativo] = useState(0);
  const [esito, setEsito] = useState(null);
  const utenteId = sessione?.utenteId;
  const chiave = `${utenteId}:${tentativo}`;
  useEffect(() => {
    if (!utenteId) return undefined;
    const controller = new AbortController();
    caricaProfilo(controller.signal).then(
      (profilo) => { if (!controller.signal.aborted) setEsito({ chiave, profilo }); },
      (errore) => { if (!controller.signal.aborted) setEsito({ chiave, errore: errore.message }); },
    );
    return () => controller.abort();
  }, [chiave, utenteId]);
  const corrente = esito?.chiave === chiave ? esito : null;
  return { profilo: corrente?.profilo, errore: corrente?.errore, caricamento: !corrente, riprova: () => setTentativo((n) => n + 1) };
}
