import { campo, etichetta } from "./campo.js";
import { pulsante } from "./pulsante.js";
import { titoloSezione } from "./superficie.js";

// Sezione Sicurezza del profilo: elenco dei metodi e finestre delle procedure
// (attivazione e disattivazione dell'app, aggiunta e rimozione delle passkey).
// Nessuno stile nei componenti.
export const STILI_SICUREZZA = {
  sezione: "min-w-0 space-y-6",
  titoloSezione: titoloSezione(),
  introduzione: "mt-1 text-sm leading-relaxed text-testo-tenue",
  proposto: "mt-3 text-sm font-medium text-testo-forte",
  elenco: "divide-y divide-divisore",
  // Griglia del metodo: una colonna su mobile; da sm testata | azioni in alto
  // e contenuto (le passkey) sotto, su tutta la larghezza.
  riga: "grid gap-4 py-5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6",
  testata: "flex min-w-0 items-start gap-3 sm:col-start-1 sm:row-start-1",
  testo: "min-w-0 flex-1",
  contenutoMetodo: "pl-7.5 sm:col-span-2 sm:row-start-2",
  icona: "mt-0.5 size-icona shrink-0 text-testo-tenue",
  nome: "text-sm font-semibold text-testo-forte",
  descrizione: "mt-1 text-sm leading-relaxed text-testo-tenue",
  stato: "mt-2 text-sm text-testo",
  statoAttivo: "mt-2 text-sm font-medium text-positivo",
  // Su mobile le azioni vanno sotto il testo, allineate al titolo e non all'icona
  // (icona 4.5 + spazio 3 = 7.5); da sm stanno a destra.
  // items-start e self-start: nella griglia i pulsanti tengono la loro altezza.
  azioniMetodo: "flex flex-wrap items-start gap-2 self-start pl-7.5 sm:col-start-2 sm:row-start-1 sm:justify-end sm:pl-0",
  azioni: "flex shrink-0 flex-wrap gap-2",
  azionePrimaria: pulsante("primario"),
  azioneSecondaria: pulsante("secondario"),
  azioneDiscreta: pulsante("discreto"),
  // Azioni che tolgono un metodo: sempre rosse, anche nelle finestre di conferma.
  azionePericolo: pulsante("pericolo"),
  azionePericoloPiccola: pulsante("pericolo", "piccolo"),
  // Finestra di dialogo delle procedure.
  dialogo: "dialogo__contenuto gap-5 overflow-y-auto",
  dialogoTestata: "space-y-1",
  dialogoTitolo: titoloSezione(),
  dialogoDescrizione: "text-sm leading-relaxed text-testo-tenue",
  modulo: "space-y-4",
  passi: "text-sm leading-relaxed text-testo",
  attesa: "flex items-center gap-2 text-sm text-testo",
  attesaIcona: "size-icona shrink-0 animate-spin text-primario",
  etichetta: etichetta(),
  campo: campo("comodo"),
  qrRiquadro: "flex justify-center",
  qr: "inline-block rounded-superficie border border-bordo bg-superficie p-3",
  qrImmagine: "block size-44",
  chiave: "mt-1 block font-mono text-sm tracking-wider text-testo-forte [overflow-wrap:anywhere]",
  // Una passkey per riga: testo a sinistra che va a capo da solo, "Rimuovi" a destra.
  // Su mobile le righe occupano la colonna; da sm l'elenco e' largo quanto il
  // contenuto (tra 20 e 28rem) e tutte le righe hanno la stessa larghezza.
  elencoPasskey: "grid gap-2 sm:w-fit sm:min-w-80 sm:max-w-md",
  passkey: "flex items-center gap-3 rounded-controllo border border-bordo bg-superficie px-3 py-2.5 sm:gap-6",
  passkeyTesto: "min-w-0 flex-1 space-y-0.5",
  passkeyNome: "flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-testo-forte [overflow-wrap:anywhere]",
  passkeyEtichetta: "inline-flex items-center rounded-full border border-bordo bg-superficie-tenue px-2 py-0.5 text-nota font-medium text-testo-tenue",
  passkeyDettagli: "text-nota text-testo-tenue",
};
