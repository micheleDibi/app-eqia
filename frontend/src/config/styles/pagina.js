/**
 * Varianti dell'impaginazione: contenitore del contenuto e intestazione di
 * pagina. Il componente IntestazionePagina le compone.
 */

/**
 * Contenitore del contenuto di una pagina dentro il guscio. La larghezza
 * massima e' quella del contenuto (box-content): i margini si aggiungono.
 * @param {"pagina"|"modulo"|"pratica"} larghezza  pagina: elenchi; modulo: dettagli
 *   con un modulo; pratica: scheda pratica a due colonne (1280)
 * @param {{ codaAmpia?: boolean, marginiInclusi?: boolean }} opzioni  codaAmpia:
 *   spazio in fondo per le azioni fuori dalla scheda (Modifica azienda);
 *   marginiInclusi: la larghezza massima comprende i margini (box-border), come
 *   nel design della pagina Pratiche, dove il contenuto arriva a 1064px
 */
export function contenutoPagina(
  larghezza = "pagina",
  { codaAmpia = false, marginiInclusi = false } = {},
) {
  if (larghezza === "pratica") {
    return "mx-auto box-content max-w-pratica px-4 pt-6 pb-15 sm:px-7";
  }
  if (larghezza === "modulo") {
    return `mx-auto box-content max-w-modulo px-4 pt-6 ${codaAmpia ? "pb-30" : "pb-10"} sm:px-7`;
  }
  return `mx-auto ${marginiInclusi ? "box-border" : "box-content"} max-w-pagina px-4 pt-8 pb-15 sm:px-7`;
}

/**
 * Collegamento di ritorno, poi titolo con descrizione a sinistra e azioni a
 * destra. Il margine in fondo coincide con quello del banner che segue.
 */
export function intestazionePagina() {
  return "mb-5 flex flex-col gap-2";
}

/** Riga con titolo e descrizione a sinistra, azioni a destra. */
export function rigaIntestazionePagina() {
  return "flex flex-wrap items-end justify-between gap-4";
}

export function titoloPagina() {
  return "text-titolo-pagina text-primario";
}

/** Riga sotto il titolo: testo semplice o piu' elementi (nome, codice, stato). */
export function descrizionePagina() {
  return "flex flex-wrap items-center gap-2.5 text-sm leading-[normal] text-testo-tenue";
}

/**
 * Collegamento di ritorno sopra il titolo delle pagine di dettaglio. Come nel
 * design, il passaggio del puntatore non ne cambia il colore.
 */
export function collegamentoIndietro() {
  return "inline-flex items-center gap-1.5 self-start text-sm leading-[normal] text-testo-tenue";
}
