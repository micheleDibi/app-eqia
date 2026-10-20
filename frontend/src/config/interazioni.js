// Pausa prima di annunciare un riepilogo, per non leggere ogni battitura.
export const PAUSA_ANNUNCIO_DIGITAZIONE_MS = 700;

// Permanenza del riscontro dopo il completamento, distinta dalla transizione CSS.
export const DURATA_CONFERMA_AZIONE_MS = 1600;

// Permanenza degli avvisi verdi temporanei della scheda pratica ("File
// caricato: …", "Firma salvata."), come nel design.
export const DURATA_AVVISO_ESITO_MS = 3000;

// Ogni quanto si rilegge il numero delle pratiche con messaggi da leggere
// (menu, Dashboard, riquadro degli elenchi). Si interroga il server solo con
// la scheda del browser in vista; al ritorno in vista si rilegge subito.
export const INTERVALLO_MESSAGGI_DA_LEGGERE_MS = 60000;
