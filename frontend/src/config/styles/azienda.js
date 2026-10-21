/**
 * Composizioni della scheda di un centro ("Modifica centro"). Usano solo i
 * ruoli e le varianti condivise: qui si fissa come si combinano.
 */
import { STILI_ANAGRAFICA } from "./anagrafica.js";
import { scheda } from "./superficie.js";

// Asterisco dei campi obbligatori a 600, il peso dell'etichetta: nel design
// della scheda centro e' uno span che lo eredita. CampoModulo, condiviso, lo
// rende a 700 (`font-bold`) come nel design del sottoscrittore, dove e' un <b>.
const ASTERISCO_AZIENDA = "[&_label>b]:font-semibold";

export const STILI_AZIENDA = {
  // Codici da leggere carattere per carattere: IBAN, BIC, codice nazionale.
  monospazio: "font-mono",
  // Riquadro con le sezioni della scheda.
  schedaModulo: `${scheda()} ${ASTERISCO_AZIENDA}`,
  modulo: "flex flex-col gap-5",
  // Lo stesso delle schede di sottoscrittori e attuatori.
  riquadroAvviso: STILI_ANAGRAFICA.riquadroAvviso,
  // Attuatori: Nominativo e Ruolo, la freccia che apre la scheda a destra.
  // L'intestazione della colonna della freccia c'e' per i lettori di schermo.
  intestazioneNascosta: "sr-only",
  cellaApri: "w-14 text-right",
  // Nominativo e ruolo vanno a capo: niente scorrimento orizzontale su un
  // telefono. `!` perche' cella() fissa gia' white-space.
  cellaTesto: "whitespace-normal! wrap-anywhere",
  vuotoAttuatori: "text-sm text-testo-tenue",
  // Nome del centro con la freccia che apre la sua scheda (scheda Centro di
  // un attuatore).
  nomeCentro: "flex min-w-0 items-center gap-2",
};
