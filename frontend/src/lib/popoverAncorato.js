/**
 * Posizione nel viewport visibile, compreso quello ridotto dalla tastiera.
 * `allinea` sceglie il bordo del comando a cui si allinea il pannello: "fine"
 * (destro, i filtri) o "inizio" (sinistro, gli avvisi); `rientro` sposta il
 * pannello oltre quel bordo, verso l'esterno.
 */
export function posizionePopover(ancora, pannello, viewport, distanza, { allinea = "fine", rientro = 0 } = {}) {
  const minimoX = viewport.left + distanza;
  const minimoY = viewport.top + distanza;
  const limiteY = viewport.top + viewport.height - distanza;
  const sotto = Math.max(0, limiteY - ancora.bottom - distanza);
  const sopra = Math.max(0, ancora.top - distanza - minimoY);
  const versoAlto = pannello.height > sotto && sopra > sotto;
  const maxHeight = Math.max(0, Math.min(viewport.height - distanza * 2, versoAlto ? sopra : sotto));
  const altezza = Math.min(pannello.height, maxHeight);
  const sinistra = allinea === "inizio" ? ancora.left - rientro : ancora.right + rientro - pannello.width;
  return {
    left: Math.max(minimoX, Math.min(sinistra,
      viewport.left + viewport.width - distanza - pannello.width)),
    top: Math.max(minimoY, Math.min(versoAlto ? ancora.top - distanza - altezza : ancora.bottom + distanza,
      limiteY - altezza)),
    maxHeight,
  };
}

function aggiornaPosizione(pannello, comando) {
  if (!pannello.matches(":popover-open")) return;
  const visuale = window.visualViewport;
  const viewport = { left: visuale?.offsetLeft ?? 0, top: visuale?.offsetTop ?? 0,
    width: Math.min(visuale?.width ?? Infinity, document.documentElement.clientWidth),
    height: visuale?.height ?? window.innerHeight };
  const stile = getComputedStyle(pannello);
  // Proprieta' registrate in index.css: il valore calcolato e' in px. Senza
  // registrazione (browser datati) i filtri ripiegano sul proprio padding.
  const distanza = Number.parseFloat(stile.getPropertyValue("--distanza-popover")) ||
    Number.parseFloat(stile.paddingTop);
  const opzioni = {
    allinea: pannello.dataset.allinea === "inizio" ? "inizio" : "fine",
    rientro: Number.parseFloat(stile.getPropertyValue("--rientro-popover")) || 0,
  };
  pannello.style.maxWidth = `${Math.max(0, viewport.width - distanza * 2)}px`;
  const dimensioni = { width: pannello.getBoundingClientRect().width,
    height: pannello.scrollHeight + Number.parseFloat(stile.borderTopWidth) + Number.parseFloat(stile.borderBottomWidth) };
  const posizione = posizionePopover(comando.getBoundingClientRect(), dimensioni, viewport, distanza, opzioni);
  for (const [nome, valore] of Object.entries(posizione)) pannello.style[nome] = `${valore}px`;
}

/** Il browser gestisce apertura, Escape e light dismiss; qui solo l'ancoraggio. */
export function osservaPopover(pannello, comando) {
  let frame;
  const aggiorna = () => { frame = undefined; aggiornaPosizione(pannello, comando); };
  const pianifica = (evento) => {
    if (evento?.newState !== "open" && !pannello.matches(":popover-open")) return;
    if (frame === undefined) frame = requestAnimationFrame(aggiorna);
  };
  const dimensioni = new ResizeObserver(pianifica);
  dimensioni.observe(pannello);
  dimensioni.observe(comando.closest("header") ?? comando);
  pannello.addEventListener("beforetoggle", pianifica);
  window.addEventListener("scroll", pianifica, true);
  window.addEventListener("resize", pianifica);
  window.visualViewport?.addEventListener("resize", pianifica);
  window.visualViewport?.addEventListener("scroll", pianifica);
  return () => {
    cancelAnimationFrame(frame);
    dimensioni.disconnect();
    pannello.removeEventListener("beforetoggle", pianifica);
    window.removeEventListener("scroll", pianifica, true);
    window.removeEventListener("resize", pianifica);
    window.visualViewport?.removeEventListener("resize", pianifica);
    window.visualViewport?.removeEventListener("scroll", pianifica);
  };
}
