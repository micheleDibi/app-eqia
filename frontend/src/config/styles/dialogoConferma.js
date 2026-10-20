import { titoloSezioneModulo } from "./superficie.js";

// Finestra di conferma (DialogoConferma.jsx): titolo, testo e pulsanti in
// basso a destra; su mobile i pulsanti si impilano, conferma in cima.
export const STILI_DIALOGO_CONFERMA = {
  contenuto: "dialogo__contenuto gap-6",
  testata: "space-y-2",
  titolo: titoloSezioneModulo(),
  messaggio: "text-sm leading-relaxed text-testo-tenue",
  pulsanti: "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end",
};
