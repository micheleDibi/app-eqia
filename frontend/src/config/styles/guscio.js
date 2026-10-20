/**
 * Varianti del guscio dell'applicazione: barra laterale, barra superiore da
 * mobile, cassetto del menu e area del contenuto.
 *
 * Soglia: da lg in su la barra laterale e' fissa; sotto, il menu si apre da un
 * pulsante nella barra superiore.
 */
import { pulsanteIcona } from "./pulsante.js";

export function barraLaterale() {
  return (
    "fixed inset-y-0 left-0 z-30 hidden w-barra-laterale " +
    "border-r border-bordo bg-superficie lg:block"
  );
}

export function barraSuperiore() {
  return (
    "sticky top-0 z-20 flex h-barra-superiore items-center gap-3 " +
    "border-b border-bordo bg-superficie/90 px-4 backdrop-blur lg:hidden"
  );
}

/** Pulsante «Apri il menu» della barra superiore: porta il pallino. */
export function pulsanteMenu() {
  return `${pulsanteIcona("neutro", "grande")} relative`;
}

/**
 * Pallino delle pratiche con messaggi da leggere, in alto a destra
 * dell'icona del pulsante «Apri il menu» (icona da 18px in 44px).
 */
export function pallinoMenu() {
  return "pointer-events-none absolute top-2.5 right-2.5 size-2.5 rounded-full bg-negativo ring-2 ring-superficie";
}

/**
 * Area del contenuto. min-w-0 e' essenziale: senza, una tabella larga allarga
 * l'intera pagina invece di scorrere nel proprio contenitore.
 */
export function areaContenuto() {
  return "min-w-0 lg:pl-barra-laterale";
}
