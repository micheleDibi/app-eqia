/**
 * Varianti degli elenchi: la scheda che contiene barra strumenti e tabella,
 * le celle e lo stato vuoto.
 *
 * Struttura di un elenco:
 *
 *   <div className={schedaElenco()}>
 *     <BarraStrumenti>...ricerca e filtri...</BarraStrumenti>
 *     <div className={scorrimentoTabella()}>
 *       <table className={tabella()}>
 *         <thead className={intestazioneTabella()}>
 *           <tr><th className={cellaIntestazione()}>Nome</th></tr>
 *         </thead>
 *         <tbody>
 *           <tr className={rigaTabella()}><td className={cella("forte")}>...</td></tr>
 *         </tbody>
 *       </table>
 *     </div>
 *   </div>
 */

/** Scheda di un elenco: barra strumenti e tabella sulla stessa superficie. */
export function schedaElenco(variante = "completa") {
  const forma = variante === "corpo" ? "rounded-b-superficie border-t-0" : "rounded-superficie";
  return `bg-superficie border border-bordo ${forma} overflow-hidden`;
}

/** Barra degli strumenti in testa all'elenco: ricerca e filtri a sinistra. */
export function barraStrumenti() {
  return (
    "flex flex-col gap-3 border-b border-bordo p-4 " +
    "sm:flex-row sm:items-center sm:justify-between"
  );
}

/** Lo scorrimento orizzontale di una tabella larga resta qui dentro. */
export function scorrimentoTabella() {
  return "relative w-full overflow-x-auto";
}

export function tabella() {
  return "min-w-full text-left";
}

/**
 * Tabella a se' stante, fuori da una scheda di elenco (dettagli del prodotto):
 * porta con se' la propria superficie.
 */
export function contenitoreTabella() {
  return "w-full overflow-x-auto bg-superficie border border-bordo rounded-riquadro";
}

/**
 * Fondo dell'intestazione. Etichetta e colore vengono ridichiarati da
 * cellaIntestazione() sulle celle.
 */
export function intestazioneTabella() {
  return "bg-tela text-etichetta text-testo-tenue text-left";
}

/**
 * Cella di intestazione. Il peso e' dichiarato qui perche' il browser rende i
 * <th> in grassetto e batterebbe quello ereditato.
 * @param {"sinistra"|"destra"} allineamento
 */
export function cellaIntestazione(allineamento = "sinistra") {
  const lato = allineamento === "destra" ? "text-right" : "text-left";
  return (
    `px-4 py-2.5 ${lato} border-b border-bordo text-etichetta font-semibold uppercase tracking-wider ` +
    "whitespace-nowrap text-testo-tenue"
  );
}

/** @param {boolean} cliccabile  la riga porta al dettaglio al clic */
export function rigaTabella(cliccabile = false) {
  const base = "border-b border-divisore last:border-b-0";
  return cliccabile
    ? `${base} transition-colors cursor-pointer hover:bg-riga-hover focus-within:bg-riga-hover`
    : base;
}

const TONI_CELLA = {
  normale: "text-testo",
  forte: "font-semibold text-testo",
  tenue: "text-testo-tenue",
};

/** @param {"normale"|"forte"|"tenue"} tono */
export function cella(tono = "normale") {
  return `px-4 py-2.5 text-sm whitespace-nowrap ${TONI_CELLA[tono] ?? TONI_CELLA.normale}`;
}

/**
 * Tabella di campi: una griglia di controlli con intestazione, dentro una
 * sezione di modulo. E' a griglia CSS e non una <table>, come nel design: le
 * colonne in fr e lo spazio fra le colonne (gap) non si esprimono con i
 * rientri delle celle. Il ruolo di tabella si dichiara con gli attributi ARIA.
 *
 *   <div role="table" aria-label="..." className={tabellaCampi()}>
 *     <div role="row" className={intestazioneCampi("normale", "convenzioni")}>
 *       <span role="columnheader">Ateneo</span>...
 *     </div>
 *     <div role="row" className={rigaCampi("normale", "convenzioni")}>
 *       <span role="rowheader">eCampus</span>
 *       <div role="cell">...controllo...</div>
 *     </div>
 *   </div>
 *
 * Densita': normale (gap 16, rientri 10/16: percentuali delle convenzioni);
 * compatta (gap 14, rientri 9/14 nell'intestazione e 8/14 nelle righe: altri
 * titoli). Sotto i 480px la griglia scorre in orizzontale dentro il
 * contenitore, come la tabella delle convenzioni di prima.
 */
export function tabellaCampi() {
  return "w-full overflow-x-auto rounded-riquadro border border-bordo bg-superficie";
}

// Classi statiche: Tailwind non vede quelle composte a runtime.
const COLONNE_CAMPI = {
  // Ateneo e tre tipologie di corso.
  convenzioni: "grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]",
  // Titolo, istituto, data.
  titoli: "grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_minmax(0,1fr)]",
};

const DENSITA_CAMPI = {
  normale: { intestazione: "gap-4 px-4 py-2.5", riga: "gap-4 px-4 py-2.5" },
  compatta: { intestazione: "gap-3.5 px-3.5 py-2.25", riga: "gap-3.5 px-3.5 py-2" },
};

function grigliaCampi(densita, colonne, parte) {
  const spazi = (DENSITA_CAMPI[densita] ?? DENSITA_CAMPI.normale)[parte];
  return `grid min-w-120 items-center ${COLONNE_CAMPI[colonne] ?? COLONNE_CAMPI.convenzioni} ${spazi}`;
}

/**
 * Riga di intestazione di una tabella di campi.
 * @param {"normale"|"compatta"} densita
 * @param {"convenzioni"|"titoli"} colonne
 * @param {"normale"|"tenue"} tono  tenue: tabelle di contorno ("Altri titoli")
 */
export function intestazioneCampi(densita = "normale", colonne = "convenzioni", tono = "normale") {
  const colore = tono === "tenue" ? "text-testo-attenuato" : "text-testo-tenue";
  return (
    `${grigliaCampi(densita, colonne, "intestazione")} border-b border-bordo bg-tela ` +
    `text-left text-etichetta uppercase tracking-wider ${colore}`
  );
}

/**
 * Riga di una tabella di campi: divisore sotto, tranne che nell'ultima.
 * @param {"normale"|"compatta"} densita
 * @param {"convenzioni"|"titoli"} colonne
 */
export function rigaCampi(densita = "normale", colonne = "convenzioni") {
  return `${grigliaCampi(densita, colonne, "riga")} border-b border-divisore last:border-b-0`;
}

/** Combinazione non prevista in una tabella di campi: il trattino. */
export function cellaNonApplicabile() {
  return "text-center text-sm text-testo-spento";
}

/** Cella delle azioni di riga, allineata a destra. */
export function cellaAzioni() {
  return "px-4 py-2 text-right whitespace-nowrap";
}

/** Riga di stato vuoto o di caricamento dentro il corpo della tabella. */
export function statoVuoto() {
  return "px-8 py-14 text-center text-sm text-testo-attenuato";
}
