// Stesso asset e proporzioni originali per ogni punto di identita' visiva.
export const STILI_LOGO = {
  accesso: "h-24 w-auto max-w-full",
  navigazione: "h-12 w-auto max-w-full shrink-0",
  barraMobile: "h-12 w-auto min-w-0 shrink",
  // Logo EduNews24 nel titolo del modulo in Dashboard: 28px di altezza.
  edunews24Modulo: "h-7 w-auto shrink-0",
  // Logo EduNews24 nella testata della pagina: l'altezza la da'
  // .edunews24-testata__logo (2rem, 2.25rem dai 40rem di foglio).
  edunews24Pagina: "w-auto max-w-full shrink-0",
  // Logo BandoFit nel riquadro della scheda Bandi: 36px di altezza (140px di
  // larghezza, la misura piu' grande: il PNG ne e' il doppio). Con il testo
  // ingrandito il max-width del preflight lo stringe: object-contain lo tiene
  // in proporzione, allineato a sinistra.
  bandoFitRiquadro: "h-9 w-auto shrink-0 object-contain object-left",
  // Logo BandoFit nella striscia del modulo in Dashboard: 24px di altezza.
  bandoFitStriscia: "h-6 w-auto shrink-0 object-contain object-left",
};
