/**
 * Varianti del menu di navigazione: voci, icone e marchio dell'applicazione.
 *
 * La voce attiva e' tinta, non piena: lo sfondo tenue con il testo nella tinta
 * primaria segnala la posizione senza pesare quanto un pulsante.
 */

const VOCE =
  "group flex w-full items-center gap-3 rounded-controllo px-3 py-2 " +
  "text-sm font-medium transition-colors cursor-pointer " +
  "focus:outline-none focus-visible:ring-3 focus-visible:ring-fuoco/30";

export function voceNavigazione(attiva = false) {
  return attiva
    ? `${VOCE} bg-navigazione-selezionata text-primario shadow-selezione hover:bg-navigazione-selezionata-hover`
    : `${VOCE} text-testo-tenue hover:bg-navigazione-hover hover:text-testo-forte`;
}

export function iconaNavigazione(attiva = false) {
  const colore = attiva
    ? "text-primario"
    : "text-testo-tenue group-hover:text-testo-forte";
  return `size-icona shrink-0 ${colore}`;
}

/** Segno di link esterno, in fondo alla voce: piu' piccolo e sempre tenue. */
export function iconaEsterna() {
  return "ml-auto size-3.5 shrink-0 text-testo-tenue";
}

/**
 * Contatore delle pratiche con messaggi da leggere, in fondo alla voce
 * «Pratiche»: rosso anche sulla voce attiva, quindi non dipende dallo stato.
 */
export function contatoreNavigazione() {
  return (
    "ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-negativo px-1.5 " +
    "text-[11px] leading-none font-semibold tabular-nums text-su-primario"
  );
}

/**
 * Voce «Sicurezza sul Lavoro 81/08» quando si e' dentro la sezione: a 600 nel
 * colore primario, senza fondo ne' riga, perche' la posizione la segna la voce
 * del sottomenu. Nessun cambio al passaggio del puntatore, come nel design.
 */
export function voceNavigazioneSezione() {
  return (
    "flex w-full items-center gap-3 rounded-controllo px-3 py-2 text-sm font-semibold text-primario " +
    "cursor-pointer focus:outline-none focus-visible:ring-3 focus-visible:ring-fuoco/30"
  );
}

export function iconaNavigazioneSezione() {
  return "size-icona shrink-0 text-primario";
}

/** Gruppo di voce madre e sottomenu: flex in colonna come nel design, cosi' i
 * 6px sotto il sottomenu restano dentro il gruppo invece di fondersi con lo
 * spazio della voce successiva. */
export function gruppoNavigazioneSezione() {
  return "flex flex-col";
}

/** Sottomenu della sezione: filo a sinistra a 21 + 10px dal bordo della voce madre. */
export function sottomenuNavigazione() {
  return "mt-0.5 mb-1.5 ml-5.25 flex flex-col gap-0.5 border-l border-bordo pl-2.5";
}

/** Voce del sottomenu: 7×12px; attiva con il fondo e la riga accento della voce attiva del menu. */
export function voceSottomenu(attiva = false) {
  const base =
    "block rounded-controllo px-3 py-1.75 text-sm whitespace-nowrap transition-colors " +
    "focus:outline-none focus-visible:ring-3 focus-visible:ring-fuoco/30";
  return attiva
    ? `${base} bg-navigazione-selezionata font-semibold text-primario shadow-selezione`
    : `${base} font-medium text-testo-tenue hover:text-primario`;
}

/** L'uscita condivide il feedback delle altre voci del menu. */
export function voceUscita() {
  return `${VOCE} text-testo-tenue hover:bg-navigazione-hover hover:text-testo-forte`;
}

/**
 * Versione e data dell'ultimo aggiornamento: in fondo all'elenco delle voci,
 * sopra la linea che le separa da profilo e uscita. Il rientro (padding del menu
 * + padding della voce) la allinea alle icone.
 */
export function notaVersione() {
  return "shrink-0 px-6 pb-3 text-nota leading-relaxed text-testo-tenue";
}

/**
 * Testata del menu con il logo dell'applicazione. Alta quanto la barra
 * superiore da mobile, cosi' le due restano allineate passando da una all'altra.
 */
export function testataMenu() {
  return "flex h-barra-superiore shrink-0 items-center gap-3 border-b border-bordo px-5";
}
