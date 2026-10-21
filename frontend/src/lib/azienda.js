import { apiFetch, leggiJson } from "./api.js";
import { descriviErrore, ErroreApi } from "./erroriApi.js";
import { CAMPI_ANAGRAFICI, CAMPI_AZIENDA } from "../config/campiAzienda.js";
import { TESTI_AZIENDA as testi } from "../config/testi/azienda.js";
import { TESTI_CENTRO } from "../config/testi/anagrafica.js";

// Scheda di un centro: backend/src/aziende/scheda.py.

/** Il modulo prima della lettura: tutti i campi vuoti. */
export const CENTRO_VUOTO = Object.freeze(Object.fromEntries(CAMPI_AZIENDA.map((campo) => [campo, ""])));

/** I valori del modulo letti da una scheda del server: null diventa vuoto. */
export function datiCentro(scheda) {
  return { ...Object.fromEntries(CAMPI_AZIENDA.map((campo) => [campo, scheda[campo] ?? ""])),
    azienda_padre_id: scheda.azienda_padre_id ?? null, padre_nome: scheda.padre_nome ?? null };
}

/**
 * Le sole colonne cambiate, pronte per il PUT. Il codice nazionale non si
 * manda mai; i dati anagrafici solo con il permesso: senza, sono a video in
 * sola lettura e non cambiano comunque.
 * @param {{ anagrafici?: boolean }} permessi
 */
export function modificheCentro(dati, salvati, permessi = {}) {
  const modifiche = Object.fromEntries(CAMPI_AZIENDA
    .filter((campo) => campo !== "azienda_codice_nazionale")
    .filter((campo) => permessi.anagrafici || !CAMPI_ANAGRAFICI.includes(campo))
    .filter((campo) => dati[campo] !== salvati[campo])
    .map((campo) => [campo, dati[campo]]));
  if (permessi.gerarchia && dati.azienda_padre_id !== salvati.azienda_padre_id)
    modifiche.azienda_padre_id = dati.azienda_padre_id;
  return modifiche;
}

/**
 * Partita IVA da segnalare mentre si scrive: non vuota e diversa da 11 cifre.
 * E' un avviso, non un blocco: il server rifiuta comunque il salvataggio.
 */
export function pivaNonConforme(valore) {
  const testo = String(valore ?? "");
  return testo !== "" && !/^\d{11}$/.test(testo);
}

/** Partita IVA da cercare: esattamente 11 cifre. */
export function partitaIvaCompleta(valore) {
  return /^\d{11}$/.test(String(valore ?? ""));
}

/** "Rossi Mario": l'ordine degli elenchi, per cognome. */
export function nominativoAttuatore(attuatore) {
  return [attuatore.cliente_cognome, attuatore.cliente_nome].filter(Boolean).join(" ") || testi.trattino;
}

async function json(risposta, errore) {
  const dati = await leggiJson(risposta);
  if (!risposta.ok) throw new ErroreApi(descriviErrore(risposta, dati, errore), risposta.status);
  return dati;
}

export async function leggiCentro(aziendaId, signal) {
  return json(await apiFetch(`/aziende/${aziendaId}`, { signal, cache: "no-store" }), testi.erroreLettura);
}

/**
 * Il centro visibile con questa partita IVA ({ azienda_id,
 * azienda_ragione_sociale }); ErroreApi con stato 404 se non c'e'.
 */
export async function cercaCentroPartitaIva(partitaIva) {
  return json(await apiFetch(`/aziende/partita-iva/${encodeURIComponent(partitaIva)}`, { cache: "no-store" }),
    TESTI_CENTRO.erroreRicerca);
}

/** Salva le modifiche; risponde con la scheda aggiornata. */
export async function salvaCentro(aziendaId, modifiche) {
  const risposta = await apiFetch(`/aziende/${aziendaId}`, { method: "PUT", body: JSON.stringify(modifiche) });
  return json(risposta, testi.erroreSalvataggio);
}
