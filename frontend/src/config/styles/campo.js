/**
 * Varianti dei controlli di immissione: input, select e textarea.
 *
 * Nessun componente: il controllo resta quello nativo e da qui arriva solo la
 * sua configurazione visuale, come chiede lo standard UI.
 *
 *   <label className={etichetta()}>Email</label>
 *   <input className={campo()} />
 *   <select className={campo("comodo")} />
 *
 * Aspetto: fondo bianco, bordo sottile senza ombra; la messa a fuoco scurisce
 * il bordo e aggiunge un alone nella tinta dell'azione primaria. Le dimensioni
 * fissano altezza, rientro e corpo del testo; il raggio e' uno per tutti.
 *
 * Bordo, fondo e colori della messa a fuoco sono calcolati in modo esclusivo
 * (normale, errore, avviso): due utility sulla stessa proprieta' hanno un
 * ordine non garantito nel CSS generato. La sola lettura usa `[&[readonly]]`,
 * non `read-only:`, perche' Chrome considera :read-only anche select e caselle.
 * Un campo in sola lettura resta raggiungibile con Tab: tiene fondo e testo
 * grigi, ma alla messa a fuoco prende bordo e alone primari, cosi' chi usa la
 * tastiera vede dove si trova.
 */

const BASE =
  "w-full border rounded-controllo transition-colors placeholder:text-testo-segnaposto " +
  "focus:outline-none focus:ring-3 " +
  "[&:is(select)]:px-2.5 [&:is(textarea)]:h-auto [&:is(textarea)]:py-2.5 " +
  "disabled:bg-superficie-alta disabled:border-bordo-controllo-tenue disabled:text-testo-sola-lettura " +
  "[&[readonly]]:bg-superficie-alta [&[readonly]]:border-bordo-controllo-tenue " +
  "[&[readonly]]:focus:border-fuoco [&[readonly]]:focus:ring-fuoco/12";

// Testo di un campo in sola lettura: uno solo per campo, scelto in campo()
// (due utility con la stessa specificita' avrebbero un ordine non garantito).
const TESTO_LETTURA = {
  attenuato: "[&[readonly]]:text-testo-sola-lettura",
  // Scheda pratica: prezzo e data di creazione in #4a4a55, come nel design.
  secondario: "[&[readonly]]:text-testo-secondario",
};

// Una sola regola per le date in ogni dimensione: stessa specificita', niente
// conflitti fra rientri diversi.
const DIMENSIONI = {
  // 36: tabella "Altri titoli", dettagli del prodotto.
  minimo: "h-9 px-3 text-dettaglio text-testo-secondario [&[type=date]]:px-2",
  // 38: altri recapiti, anno integrativo.
  secondario: "h-9.5 px-3 text-dettaglio text-testo-secondario [&[type=date]]:px-3",
  // 38: percentuali delle convenzioni.
  tabella: "h-9.5 px-3 text-sm text-testo [&[type=date]]:px-3",
  // 40: ricerca e filtri (predefinito).
  compatto: "h-controllo-compatto px-3 text-sm text-testo [&[type=date]]:px-3",
  // 42: standard dei moduli.
  comodo: "h-controllo px-3.5 text-sm text-testo [&[type=date]]:px-3",
  // 46, 15/500: valore in evidenza ("Diploma", "Titolo").
  evidenziato: "h-11.5 px-3.5 text-evidenziato text-testo [&[type=date]]:px-3",
  // 48: accesso e recupero della password.
  ampio: "h-12 px-3.5 text-base text-testo [&[type=date]]:px-3",
  // 48, 16/500: email e cellulare nelle schede dei recapiti.
  recapito: "h-12 px-3.5 text-base font-medium text-testo [&[type=date]]:px-3",
};

// Dimensioni dei campi di contorno: bordo piu' chiaro.
const TENUI = new Set(["minimo", "secondario"]);

/**
 * @param {"minimo"|"secondario"|"tabella"|"compatto"|"comodo"|"evidenziato"|"ampio"|"recapito"} dimensione
 * @param {{ errore?: boolean, avviso?: boolean, fuocoAvviso?: "primario"|"ambra",
 *   riservato?: boolean, testoLettura?: "attenuato"|"secondario" }} opzioni
 *   errore: il valore non ha superato la validazione;
 *   avviso: il valore salvato ha un'anomalia da controllare (bordo e fondo
 *   ambra; il recapito tiene il fondo bianco, come nel design);
 *   fuocoAvviso: messa a fuoco di un campo in avviso. Primaria come in
 *   "Modifica sottoscrittore", dove la regola globale sul focus vince sul
 *   bordo ambra; ambra (bordo e alone) come in "Modifica azienda".
 *   riservato: campo che modifica solo il Nazionale (scheda pratica: stato e
 *   codici), con il bordo lilla del design al posto di quello grigio;
 *   testoLettura: colore del testo in sola lettura, attenuato (predefinito)
 *   o secondario.
 */
export function campo(
  dimensione = "compatto",
  { errore = false, avviso = false, fuocoAvviso = "primario", riservato = false, testoLettura = "attenuato" } = {},
) {
  const bordo = riservato ? "border-su-primario-tenue"
    : TENUI.has(dimensione) ? "border-bordo-controllo-tenue" : "border-bordo-controllo";
  const stato = errore
    ? "bg-superficie border-negativo focus:border-negativo focus:ring-negativo/12"
    : avviso
      ? `${dimensione === "recapito" ? "bg-superficie" : "bg-attenzione-campo"} border-attenzione-campo-bordo ` +
        (fuocoAvviso === "ambra"
          ? "focus:border-attenzione-campo-bordo focus:ring-attenzione-campo-bordo/20"
          : "focus:border-fuoco focus:ring-fuoco/12")
      : `bg-superficie ${bordo} focus:border-fuoco focus:ring-fuoco/12`;
  return [BASE, TESTO_LETTURA[testoLettura] ?? TESTO_LETTURA.attenuato, DIMENSIONI[dimensione] ?? DIMENSIONI.compatto, stato]
    .join(" ");
}

/**
 * Etichetta di un campo: maiuscoletto spaziato.
 * @param {"compatta"|"secondaria"|"leggibile"} variante
 *   secondaria: campi di contorno (altri recapiti, anno integrativo).
 */
export function etichetta(variante = "compatta") {
  if (variante === "leggibile") return "block text-sm font-medium text-testo-forte mb-2";
  if (variante === "secondaria") return "block text-etichetta uppercase tracking-wider text-testo-attenuato mb-1.5";
  return "block text-etichetta uppercase tracking-wider text-testo-tenue mb-2";
}

const TONI_NOTA = {
  neutra: "text-testo-tenue",
  avviso: "text-attenzione-nota",
  errore: "text-negativo",
  // Scheda pratica: "Prezzo da rinnovo agevolato", verde dello stato Conclusa.
  positivo: "text-stato-conclusa",
};

/**
 * Nota breve sotto un campo. L'interlinea e' quella naturale del carattere,
 * come nel design.
 * @param {"neutra"|"avviso"|"errore"|"positivo"} tono
 */
export function notaCampo(tono = "neutra") {
  return `mt-2 text-nota leading-[normal] ${TONI_NOTA[tono] ?? TONI_NOTA.neutra}`;
}

/** Casella di spunta e pulsante di scelta. */
export function spunta() {
  return "size-4.5 m-0 shrink-0 cursor-pointer accent-primario";
}

/** Casella con il suo testo sulla stessa riga, dentro una <label>. */
export function sceltaInLinea() {
  return "flex items-center gap-2.5 text-sm text-testo cursor-pointer";
}

/** Casella a scheda: la <label> intera e' il riquadro cliccabile. */
export function sceltaRiquadro() {
  return (
    "flex items-center gap-2.5 rounded-riquadro border border-bordo bg-superficie-tenue " +
    "p-3.5 text-sm text-testo cursor-pointer"
  );
}

/**
 * Unita' di misura dentro il campo ("%"). Il contenitore e' `relative` e il
 * campo lascia spazio a destra (pr-7.5).
 */
export function suffissoCampo() {
  return "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dettaglio text-testo-attenuato";
}
