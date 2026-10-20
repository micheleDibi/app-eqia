import { pulsanteIcona } from "./pulsante.js";
import { scheda, titoloSezione } from "./superficie.js";
import { etichetta } from "./campo.js";

export const STILI_PROFILO = {
  icona: "size-icona shrink-0",
  contenitore: `${scheda()} schede overflow-hidden`,
  pannello: "schede__pannello focus:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-fuoco/30",
  sezioni: "space-y-8",
  colonne: "grid grid-cols-1 md:grid-cols-2 gap-8",
  separatore: "border-divisore",
  sezione: "min-w-0",
  titoloSezione: titoloSezione(),
  dati: "grid gap-x-8 gap-y-5 sm:grid-cols-2",
  datiIndirizzo: "grid grid-cols-2 gap-x-4 gap-y-5",
  campo: "min-w-0",
  etichetta: etichetta(),
  valore: "text-sm leading-relaxed text-testo-forte [overflow-wrap:anywhere]",
  azienda: "min-w-0 sm:col-span-2",
  caricamento: "flex items-center gap-3 py-8 text-sm text-testo-tenue",
  attesa: "size-icona motion-safe:animate-spin",
};

const COLONNE_INDIRIZZO = { citta: "col-span-2" };

export function campoProfilo(chiave, indirizzo = false) {
  return `${STILI_PROFILO.campo} ${indirizzo ? COLONNE_INDIRIZZO[chiave] ?? "" : ""}`;
}

export function accessoProfiloMobile(attivo) {
  return `${pulsanteIcona(attivo ? "selezionato" : "neutro", "grande")} ml-auto`;
}
