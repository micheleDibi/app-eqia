import { campo, etichetta } from "./campo.js";
import { pulsante } from "./pulsante.js";
import { scheda } from "./superficie.js";
import { titoloPagina } from "./pagina.js";
import { STILI_LOGO } from "./identita.js";

// Ricette condivise da accesso, richiesta e conferma del recupero.
// my-auto centra solo quando c'e' spazio: schede alte e tastiera restano scorribili.
export const STILI_ACCESSO = {
  pagina: "min-h-dvh flex flex-col items-center bg-tela px-4 py-8 sm:py-12",
  gruppo: "my-auto w-full max-w-md space-y-6",
  identita: "flex justify-center",
  logo: STILI_LOGO.accesso,
  scheda: `${scheda()} p-5 sm:p-8`,
  intestazione: "mb-7 space-y-2",
  titolo: `${titoloPagina()} text-balance focus:outline-none`,
  descrizione: "text-sm leading-relaxed text-testo-tenue",
  contenuto: "space-y-5",
  modulo: "space-y-5",
  etichetta: etichetta("leggibile"),
  campo: campo("ampio"),
  azione: `${pulsante("primario", "grande", { larghezzaPiena: true })} min-h-12 focus-visible:ring-fuoco! focus-visible:ring-offset-2`,
  collegamento: "inline-flex min-h-11 items-center justify-center rounded-controllo px-2 text-sm font-medium text-primario underline-offset-4 hover:underline focus:outline-none focus-visible:ring-3 focus-visible:ring-fuoco",
  ritorno: "flex justify-center",
  contesto: "border-l-2 border-bordo-forte pl-3 text-sm leading-relaxed text-testo",
  attesa: "text-center text-sm text-testo",
  nota: "text-sm leading-relaxed text-testo-tenue",
  stato: "flex items-center gap-2 text-sm text-testo",
  icona: "size-icona-piccola shrink-0",
  caricamento: "size-icona-piccola shrink-0 motion-safe:animate-spin",
  soloLettura: "sr-only",
};
