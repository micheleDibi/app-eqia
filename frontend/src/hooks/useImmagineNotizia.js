import { useEffect, useState } from "react";
import { leggiImmagine } from "../lib/notizie.js";

/**
 * L'indirizzo blob: dell'immagine di una notizia, o null finche' non c'e'
 * (o se non si legge: la notizia si mostra comunque, senza immagine).
 * `presente` evita la richiesta per le notizie senza immagine; `versione`
 * la ripete quando l'immagine cambia. L'indirizzo si libera allo smontaggio.
 */
export function useImmagineNotizia(notiziaId, presente, versione) {
  const [stato, setStato] = useState({ chiave: null, url: null });
  const chiave = presente ? `${notiziaId}/${versione ?? ""}` : null;

  useEffect(() => {
    if (!chiave) return undefined;
    const controllo = new AbortController();
    let url = null;
    leggiImmagine(notiziaId, controllo.signal)
      .then((blob) => {
        if (controllo.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setStato({ chiave, url });
      })
      .catch(() => {});
    return () => {
      controllo.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [chiave, notiziaId]);

  return stato.chiave === chiave ? stato.url : null;
}
