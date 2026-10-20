import { useEffect, useState } from "react";
import { caricaCategorieEduNews24 } from "../lib/edunews24Api.js";

const ATTESA = { stato: "attesa", categorie: [] };

/**
 * Categorie delle notizie, chieste solo quando servono (`attivo`) e, se
 * arrivano, una volta sola per la vita della pagina. Il vincolo viene dallo
 * stato, non da un ref: regge StrictMode e il cambio di scheda. Esito: {
 * stato: "attesa" | "pronte" | "errore", categorie }; con l'errore la fila
 * delle categorie non si mostra.
 *
 * Dopo un errore si riprova una volta sola a ogni nuova `occasione`: un cambio
 * di filtro o di scheda, o la prima pagina dell'elenco arrivata. A cache
 * fredda l'elenco filtrato per categoria carica le categorie per primo, e la
 * richiesta parallela delle categorie puo' scadere mentre quella dell'elenco,
 * poco dopo, riesce. Mai tentativi in ciclo.
 */
export function useCategorieEduNews24(attivo, occasione) {
  const [esito, setEsito] = useState(ATTESA);
  const [occasioneVista, setOccasioneVista] = useState(occasione);
  if (occasione !== occasioneVista) {
    setOccasioneVista(occasione);
    if (esito.stato === "errore") setEsito(ATTESA);
  }
  const daCaricare = attivo && esito.stato === "attesa";
  useEffect(() => {
    if (!daCaricare) return undefined;
    const controller = new AbortController();
    caricaCategorieEduNews24(controller.signal).then(
      ({ categorie }) => {
        if (!controller.signal.aborted) setEsito({ stato: "pronte", categorie });
      },
      (errore) => {
        if (controller.signal.aborted || errore?.stato === 401) return;
        setEsito({ stato: "errore", categorie: [] });
      },
    );
    return () => controller.abort();
  }, [daCaricare]);
  return esito;
}
