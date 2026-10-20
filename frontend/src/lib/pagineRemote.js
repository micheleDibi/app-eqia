import { apiFetch, leggiJson } from "./api.js";

export async function caricaPagina(percorso, signal) {
  const risposta = await apiFetch(percorso, { signal });
  const dati = await leggiJson(risposta);
  if (!risposta.ok || dati === null) throw new Error("Impossibile caricare i dati. Riprova.");
  return dati;
}

export function creaPaginazione(richiedi, pubblica) {
  const controller = new AbortController();
  let elementi = [], altri = true, occupato = false, offset = 0;
  async function prossima() {
    if (occupato || !altri || controller.signal.aborted) return;
    occupato = true;
    pubblica({ elementi, altri, loading: true, errore: null });
    try {
      const pagina = await richiedi(offset, controller.signal);
      if (controller.signal.aborted) return;
      offset += pagina.elementi.length;
      // `chiave` prima di tutto: in un elenco con righe di tipi diversi due
      // righe possono avere lo stesso id.
      const identita = item => item?.chiave ?? item?.cliente_id ?? item?.azienda_id ?? item?.id ?? item;
      const presenti = new Set(elementi.map(identita));
      elementi = [...elementi, ...pagina.elementi.filter(item => !presenti.has(identita(item)))];
      altri = pagina.altri;
      pubblica({ elementi, altri, loading: false, errore: null });
    } catch (errore) {
      if (!controller.signal.aborted) pubblica({ elementi, altri, loading: false, errore: errore.message });
    } finally { occupato = false; }
  }
  return { prossima, annulla: () => controller.abort() };
}
