/**
 * Varianti dei pulsanti.
 *
 * Nessun wrapper cosmetico: il pulsante resta <button> nativo.
 *
 *   <button className={pulsante()}>Salva</button>
 *   <button className={pulsante("secondario", "piccolo")}>Modifica</button>
 *   <button className={pulsanteIcona()} aria-label="Apri il menu">...</button>
 *
 * L'anello di messa a fuoco compare solo da tastiera (focus-visible): chi usa
 * il mouse non lo vede dopo il clic, chi naviga con Tab sa sempre dove si trova.
 *
 * Altezza e raggio dipendono dalla dimensione; il rientro orizzontale dipende
 * anche dalla variante (il primario e' piu' largo del secondario accanto).
 * Il bordo sta nella variante: primario e discreto (testuale) non ne hanno,
 * come nel design; selezionato e pericolo lo tengono trasparente per non cambiare
 * larghezza quando si alternano con il secondario.
 *
 * Il passaggio del puntatore usa `not-disabled:hover:` e non `enabled:hover:`,
 * perche' `:enabled` non vale per i link (<Link>) stilati come pulsante.
 *
 * Nomi del piano delle schermate e loro equivalenti:
 *   contorno         = secondario (bordo grigio): Annulla, "Cambia padre", "Verifica";
 *   contornoPrimario = bordo e testo viola: "Salva percentuali";
 *   testuale         = discreto (senza bordo): Annulla fuori dalla card;
 *   barra = grande (42), testata = normale (40);
 *   "piccolo" del piano: 34px = piccolo, 32px = minimo.
 * Una variante o una dimensione sconosciuta ripiega su primario e normale.
 */

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap " +
  "transition-colors cursor-pointer " +
  "focus:outline-none focus-visible:ring-3 focus-visible:ring-fuoco/30 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const SECONDARIO =
  "border border-bordo-controllo bg-superficie text-testo font-normal " +
  "not-disabled:hover:bg-superficie-alta";

const DISCRETO =
  "border-0 bg-transparent text-testo-tenue font-normal not-disabled:hover:bg-superficie-premuta";

const VARIANTI = {
  primario: "border-0 bg-primario text-su-primario font-medium not-disabled:hover:bg-primario-hover",
  contornoPrimario:
    "border border-primario bg-superficie text-primario font-medium not-disabled:hover:bg-primario-velo",
  secondario: SECONDARIO,
  contorno: SECONDARIO,
  ausiliario: SECONDARIO,
  selezionato:
    "border border-transparent bg-primario-tenue text-primario font-medium " +
    "not-disabled:hover:bg-evidenza-bordo",
  pericolo: "border border-transparent bg-negativo text-su-primario font-medium not-disabled:hover:bg-negativo-forte",
  discreto: DISCRETO,
  testuale: DISCRETO,
};

const DIMENSIONI = {
  grande: "h-controllo text-sm rounded-controllo",
  normale: "h-controllo-compatto text-sm rounded-controllo",
  medio: "h-9.5 px-4 text-sm rounded-controllo",
  piccolo: "h-8.5 px-3 text-dettaglio rounded-controllo",
  minimo: "h-8 px-3 text-dettaglio rounded-comando",
};

// Nomi del piano delle schermate.
const SINONIMI_DIMENSIONE = { barra: "grande", testata: "normale" };

// Rientro orizzontale delle dimensioni che lo fanno dipendere dalla variante.
const RIENTRI = {
  grande: { primario: "px-6", pericolo: "px-6", altre: "px-4.5" },
  normale: {
    primario: "px-4",
    pericolo: "px-4",
    secondario: "px-3.5",
    contorno: "px-3.5",
    ausiliario: "px-3.5",
    selezionato: "px-3.5",
    altre: "px-4.5",
  },
};

/**
 * @param {"primario"|"contorno"|"contornoPrimario"|"secondario"|"ausiliario"|"selezionato"|"pericolo"|"discreto"|"testuale"} variante
 * @param {"grande"|"barra"|"normale"|"testata"|"medio"|"piccolo"|"minimo"} dimensione
 *   grande (barra) 42, normale (testata) 40, medio 38, piccolo 34, minimo 32.
 * @param {{ larghezzaPiena?: boolean }} opzioni
 */
export function pulsante(
  variante = "primario",
  dimensione = "normale",
  { larghezzaPiena = false } = {},
) {
  const tipo = VARIANTI[variante] ? variante : "primario";
  const nomeMisura = SINONIMI_DIMENSIONE[dimensione] ?? dimensione;
  const misura = DIMENSIONI[nomeMisura] ? nomeMisura : "normale";
  const rientri = RIENTRI[misura];
  return [
    BASE,
    VARIANTI[tipo],
    DIMENSIONI[misura],
    rientri ? rientri[tipo] ?? rientri.altre : "",
    larghezzaPiena ? "w-full" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

const COLORI_ICONA = {
  primario: VARIANTI.primario,
  neutro: "text-testo-tenue hover:bg-superficie-alta hover:text-testo",
  pericolo: "text-negativo hover:bg-negativo-tenue hover:text-negativo-forte",
  // Solo il guscio: stessa tinta dorata della voce attiva del menu.
  selezionato: "bg-navigazione-selezionata text-primario hover:bg-navigazione-selezionata-hover",
  // Segnale delle anomalie nelle righe degli elenchi.
  avviso: "bg-attenzione-comando text-attenzione-comando-testo hover:bg-attenzione-comando-hover",
};

const DIMENSIONI_ICONA = {
  minima: "size-7 rounded-comando [&_svg]:size-3.5",
  normale: "size-9 rounded-controllo",
  grande: "size-11 rounded-controllo",
};

/**
 * Pulsante con sola icona: apertura e chiusura del menu, avvisi delle righe.
 * @param {"primario"|"neutro"|"pericolo"|"selezionato"|"avviso"} variante
 * @param {"minima"|"normale"|"grande"} dimensione  minima 28, normale 36, grande 44
 */
export function pulsanteIcona(variante = "neutro", dimensione = "normale") {
  return (
    `inline-flex ${DIMENSIONI_ICONA[dimensione] ?? DIMENSIONI_ICONA.normale} shrink-0 items-center justify-center ` +
    `${COLORI_ICONA[variante] ?? COLORI_ICONA.neutro} transition-colors cursor-pointer ` +
    "focus:outline-none focus-visible:ring-3 focus-visible:ring-fuoco " +
    "disabled:opacity-50 disabled:cursor-not-allowed"
  );
}

/**
 * Azione di riga a sola icona: fondo bianco e bordo. Nelle tabelle segnala che
 * la riga e' azionabile senza pesare come un pulsante pieno; la riga stessa e'
 * comunque cliccabile.
 */
export function pulsanteAzioneRiga(dimensione = "normale") {
  return (
    `inline-flex ${dimensione === "grande" ? "size-11" : "size-9"} shrink-0 items-center justify-center rounded-controllo ` +
    "border border-bordo bg-superficie text-testo-tenue " +
    "transition-colors cursor-pointer hover:bg-superficie-alta hover:border-bordo-forte hover:text-primario " +
    "focus:outline-none focus-visible:ring-3 focus-visible:ring-fuoco/30"
  );
}
