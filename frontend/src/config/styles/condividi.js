/**
 * "Condividi" nella riga dei metadati delle notizie della pagina
 * (PulsanteCondividi). Le classi semantiche edunews24-condividi e
 * edunews24-condividi__testo stanno nel componente: sotto la soglia griglia
 * del pannello edunews24.css rende il testo sr-only e resta l'icona.
 *
 * - radice: posizionata e sopra l'estensione del link del titolo (z-[1]),
 *   in fondo a destra della riga (ms-auto): anche quando la riga va a capo il
 *   fumetto, allineato a destra, resta dentro la voce.
 * - pulsante: senza padding, alto quanto l'interlinea dei metadati, cosi' la
 *   riga non si alza. Il bersaglio di almeno 44x44 e' il ::before, centrato
 *   sul pulsante e largo almeno quanto il pulsante. Il focus e' quello della
 *   regola 1 di edunews24.css; niente transizioni.
 * - fumetto: la regione di stato stessa, sopra il pulsante e allineata a
 *   destra, nel nero notte del distintivo Video. Il bordo trasparente lo
 *   disegna in colori forzati; senza messaggio non ha padding ne' bordo (0x0)
 *   e resta nell'albero dell'accessibilita'.
 */
const FUMETTO = "pointer-events-none absolute right-0 bottom-full";

export const STILI_CONDIVIDI = {
  radice: "relative z-[1] ms-auto inline-flex",
  pulsante:
    "relative inline-flex cursor-pointer items-center gap-1 hover:text-edunews24-blu-intenso " +
    "before:absolute before:top-1/2 before:left-1/2 before:h-11 before:w-[max(100%,2.75rem)] " +
    "before:-translate-x-1/2 before:-translate-y-1/2",
  icona: "size-[1em] shrink-0",
};

/** Classi della regione di stato: con un messaggio diventa il fumetto. */
export function fumettoCondividi(visibile) {
  if (!visibile) return FUMETTO;
  return (
    `${FUMETTO} mb-1 whitespace-nowrap border border-transparent bg-edunews24-notte px-1.5 py-1 ` +
    "text-edunews24-distintivo text-edunews24-su-blu"
  );
}
