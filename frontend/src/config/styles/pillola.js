/**
 * Varianti delle pillole: stato dell'anagrafica ("Attivo"), contatto
 * verificato, etichetta di una sezione ("Titolo principale"). La spunta,
 * quando serve, e' l'icona Check del catalogo (size-3).
 *
 *   <span className={pillola("positivo")}>Attivo</span>
 *   <span className={pillola("primario", "etichetta")}>Titolo principale</span>
 *
 * Stato della pratica (scheda pratica): tono = chiave di STATI_PANNELLO,
 * forma "stato", con il pallino davanti all'etichetta.
 *
 *   <span className={pillola("attesa", "stato")}>
 *     <span className={puntoPillola("attesa")} aria-hidden="true" />In attesa di modifica
 *   </span>
 */

const BASE = "inline-flex items-center whitespace-nowrap rounded-full leading-[normal]";

const TONI = {
  positivo: "bg-positivo-tenue text-positivo",
  negativo: "bg-negativo-tenue text-negativo",
  primario: "bg-primario-tenue text-primario",
  neutro: "border border-bordo-controllo-tenue bg-superficie text-testo-attenuato",
  // Stati della pratica, per chiave di STATI_PANNELLO (lib/pannelloPratiche.js).
  bozza: "bg-stato-bozza-fondo text-stato-bozza-inchiostro",
  lavorazione: "bg-stato-lavorazione-fondo text-stato-lavorazione-inchiostro",
  attesa: "bg-stato-attesa-fondo text-stato-attesa-inchiostro",
  conclusa: "bg-stato-conclusa-fondo text-stato-conclusa-inchiostro",
  caricata: "bg-stato-caricata-fondo text-stato-caricata-inchiostro",
  rifiutata: "bg-stato-rifiutata-fondo text-stato-rifiutata-inchiostro",
  // Sicurezza sul lavoro: edizione CHIUSA e versione scaduta del catalogo.
  chiusa: "bg-stato-chiusa-fondo text-stato-chiusa-inchiostro",
};

// Pallino della pillola di stato: il colore dello stato nella pagina Pratiche.
const PUNTI = {
  bozza: "bg-stato-bozza",
  lavorazione: "bg-stato-lavorazione",
  attesa: "bg-stato-attesa",
  conclusa: "bg-stato-conclusa",
  caricata: "bg-stato-caricata",
  rifiutata: "bg-stato-rifiutata",
  chiusa: "bg-stato-chiusa",
};

const FORME = {
  // 12/600, 3/10: stato nella testata, contatto verificato.
  normale: "gap-1 px-2.5 py-0.75 text-xs font-semibold",
  // 13/600, 5/12: stato dell'utente.
  grande: "gap-1 px-3 py-1.25 text-dettaglio font-semibold",
  // 11/600 maiuscolo: etichetta di una sezione.
  etichetta: "gap-1 px-2.5 py-0.75 text-etichetta uppercase tracking-wider",
  // 13/500, 3/10, 6px fra pallino ed etichetta: stato della scheda pratica.
  stato: "gap-1.5 px-2.5 py-0.75 text-dettaglio font-medium",
};

/**
 * @param {"positivo"|"negativo"|"primario"|"neutro"|"bozza"|"lavorazione"|"attesa"|"conclusa"|"caricata"|"rifiutata"|"chiusa"} tono
 * @param {"normale"|"grande"|"etichetta"|"stato"} forma
 */
export function pillola(tono = "neutro", forma = "normale") {
  return [BASE, TONI[tono] ?? TONI.neutro, FORME[forma] ?? FORME.normale].join(" ");
}

/**
 * Pallino da 7px della pillola di stato; per una chiave sconosciuta (stato
 * senza colore) il grigio del testo tenue.
 * @param {string} chiave  chiave di STATI_PANNELLO ("bozza", "attesa"…)
 */
export function puntoPillola(chiave) {
  return `size-1.75 shrink-0 rounded-full ${PUNTI[chiave] ?? "bg-testo-tenue"}`;
}
