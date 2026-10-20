/**
 * Varianti delle superfici: pagine centrate, velo delle modali, schede e
 * titoli di sezione. Le varianti degli elenchi stanno in tabella.js.
 */

/**
 * Pagina che centra una scheda: accesso, recupero password, conferma.
 * Sono pagine normali su fondo chiaro, non finestre modali sopra un velo.
 */
export function paginaCentrata() {
  return "min-h-screen flex items-center justify-center bg-tela px-4";
}

/** Scheda principale di una pagina o di una sezione di modulo. */
export function scheda() {
  return "bg-superficie border border-bordo rounded-superficie";
}

/** Scheda in evidenza dentro una sezione: titolo principale, email e cellulare. */
export function schedaEvidenziata() {
  return "bg-evidenza border border-evidenza-bordo rounded-evidenza p-5";
}

/** Riquadro interno a una scheda: raggruppa campi affini. */
export function riquadro() {
  return "bg-superficie-tenue border border-bordo rounded-riquadro px-4 py-3.5";
}

/**
 * Titolo di sezione. Con `separato` la riga sotto il titolo usa il colore dei
 * divisori, come ogni altra separazione dentro una scheda.
 */
export function titoloSezione(variante = "semplice") {
  const base = "text-titolo-sezione text-testo";
  return variante === "separato"
    ? `${base} border-b border-divisore pb-3 mb-6`
    : `${base} mb-4`;
}

/**
 * Sezione di un modulo lungo: titolo e descrizione a sinistra, campi a
 * destra. Le sezioni consecutive sono separate da una riga.
 */
export function sezioneModulo() {
  return "flex flex-wrap gap-x-10 gap-y-6 px-6 py-7 sm:px-8 border-b border-divisore last:border-b-0";
}

/**
 * Colonna con titolo e descrizione di una sezione di modulo.
 * @param {"semplice"|"etichetta"|"azioni"} forma
 *   etichetta: con la pillola sopra il titolo; azioni: con i comandi sotto la
 *   descrizione (titolo e descrizione vanno allora in testoSezioneModulo()).
 */
export function introSezioneModulo(forma = "semplice") {
  const base = "flex flex-[1_1_200px] flex-col";
  if (forma === "etichetta") return `${base} items-start gap-2`;
  if (forma === "azioni") return `${base} items-start gap-3`;
  return `${base} gap-1.5`;
}

/** Titolo e descrizione raggruppati quando la colonna ha anche le azioni. */
export function testoSezioneModulo() {
  return "flex flex-col gap-1.5";
}

/**
 * Titolo di una sezione di modulo.
 * @param {"normale"|"evidenziato"|"secondario"} rilievo
 */
export function titoloSezioneModulo(rilievo = "normale") {
  if (rilievo === "evidenziato") return "text-titolo-evidenziato text-testo";
  if (rilievo === "secondario") return "text-sm leading-[normal] font-semibold text-testo-secondario";
  return "text-titolo-sezione text-testo";
}

/**
 * Descrizione di una sezione di modulo.
 * @param {"normale"|"evidenziato"|"secondario"} rilievo
 */
export function descrizioneSezioneModulo(rilievo = "normale") {
  const colore = rilievo === "secondario" ? "text-testo-attenuato" : "text-testo-tenue";
  return `text-descrizione ${colore} text-pretty`;
}

/**
 * Colonna dei campi di una sezione di modulo, su una griglia di 6.
 * @param {boolean} evidenziata  la colonna e' anche una schedaEvidenziata():
 *   nel design la base di 520px vale per il solo contenuto (content-box), e
 *   padding (2 x 20) e bordo (2 x 1) della scheda vi si sommano; qui le misure
 *   sono in border-box, quindi la base della scheda e' 562px.
 */
export function campiSezioneModulo(evidenziata = false) {
  return `grid ${baseContenutoSezione(evidenziata)} grid-cols-6 gap-x-5 gap-y-4.5`;
}

// Base della colonna di contenuto, con o senza griglia: vedi campiSezioneModulo().
function baseContenutoSezione(evidenziata) {
  return evidenziata ? "flex-[3_1_562px]" : "flex-[3_1_520px]";
}

/**
 * Colonna di contenuto di una sezione di modulo. Con la griglia e'
 * campiSezioneModulo(); senza, il contenuto e' libero e, se evidenziato, i
 * blocchi (campi e parte tratteggiata) si impilano con lo stesso passo delle
 * righe di campi.
 * @param {{ griglia?: boolean, evidenziata?: boolean }} opzioni
 */
export function contenutoSezioneModulo({ griglia = true, evidenziata = false } = {}) {
  if (griglia) return campiSezioneModulo(evidenziata);
  const base = baseContenutoSezione(evidenziata);
  return evidenziata ? `flex min-w-0 ${base} flex-col gap-4.5` : `min-w-0 ${base}`;
}

/** Parte facoltativa di un gruppo di campi, separata da un tratteggio. */
export function separatoreTratteggiato() {
  return "border-t border-dashed border-bordo-forte pt-4";
}

/**
 * Barra con Annulla e Salva di un modulo.
 * @param {"scheda"|"pagina"} posizione
 *   scheda: ultima figlia della scheda, agganciata in fondo mentre si scorre
 *   (la scheda deve usare overflow-clip, non overflow-hidden); la classe
 *   barra-azioni-agganciata riserva la sua altezza negli scorrimenti dovuti
 *   al fuoco (barraAzioni.css);
 *   pagina: sotto la scheda, fuori dal suo bordo.
 */
export function barraAzioniModulo(posizione = "scheda") {
  if (posizione === "pagina") return "flex items-center justify-end gap-3 pt-1";
  return (
    "barra-azioni-agganciata sticky bottom-0 z-10 flex items-center justify-end gap-3 " +
    "border-t border-bordo bg-superficie/96 px-8 py-4 rounded-b-superficie"
  );
}
