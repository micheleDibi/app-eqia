/**
 * Varianti dei messaggi: errore, conferma, avviso, informazione.
 *
 * Due forme, come nel design:
 * - voce singola: righe da 20px, quante ne occupa l'icona del design (16px con
 *   2px sopra e sotto); icona e testo restano allineati sulla prima riga, cosi'
 *   un testo su piu' righe (errori di validazione uniti da "\n") non sposta
 *   l'icona a meta' blocco, e con una riga sola il messaggio e' alto 50px come
 *   nel design;
 * - elenco (`elenco: true`): icona in alto, voci puntate con interlinea 1,55.
 *   L'avviso con elenco usa un marrone diverso dalla voce singola.
 */

const VARIANTI = {
  error: { superficie: "bg-negativo-tenue border-negativo-bordo", testo: "text-negativo-forte" },
  success: { superficie: "bg-positivo-tenue border-positivo-bordo", testo: "text-positivo-forte" },
  warning: {
    superficie: "bg-attenzione-tenue border-attenzione-bordo",
    testo: "text-attenzione-forte",
    testoElenco: "text-attenzione-testo",
  },
  info: { superficie: "bg-informazione-tenue border-informazione-bordo", testo: "text-informazione-forte" },
};

const BASE = "movimento-feedback flex rounded-riquadro border px-4.5 py-3.5 whitespace-pre-wrap";

/**
 * @param {"error"|"success"|"warning"|"info"} tipo
 * @param {{ separato?: boolean, elenco?: boolean }} opzioni
 *   separato: margine sotto il messaggio; elenco: il testo e' un elenco di voci.
 */
export function feedback(tipo, { separato = true, elenco = false } = {}) {
  const variante = VARIANTI[tipo] ?? VARIANTI.error;
  return [
    BASE,
    elenco ? "items-start gap-3 text-avviso" : "items-start gap-2.5 text-sm leading-5",
    variante.superficie,
    elenco ? variante.testoElenco ?? variante.testo : variante.testo,
    separato ? "mb-5" : "",
  ].filter(Boolean).join(" ");
}

/**
 * Icona del messaggio: con l'elenco scende di 3px per stare sulla prima riga;
 * con la voce singola occupa una riga da 20px.
 * @param {"error"|"success"|"warning"|"info"} tipo
 * @param {{ elenco?: boolean }} opzioni
 */
export function iconaFeedback(tipo, { elenco = false } = {}) {
  return [
    "size-icona-piccola shrink-0",
    elenco ? "mt-0.75" : "my-0.5",
    tipo === "warning" ? "text-attenzione" : "",
  ].filter(Boolean).join(" ");
}

/** Elenco puntato delle voci di un messaggio. */
export function elencoFeedback() {
  return "flex list-disc flex-col gap-0.5 pl-4.5";
}

/**
 * Nota secondaria dentro il riquadro, sotto il messaggio principale: stesso
 * colore ma piu' piccola e staccata (per esempio la regola dell'azzeramento
 * sotto l'avviso di conferma, vedi AlertMessage.jsx). Non un messaggio a se':
 * vive nello stesso riquadro colorato di `message`.
 * @param {"error"|"success"|"warning"|"info"} tipo
 */
export function notaFeedback(tipo) {
  const variante = VARIANTI[tipo] ?? VARIANTI.error;
  return `mt-2 text-nota ${variante.testo}`;
}

export const STILI_FEEDBACK = {
  testo: "min-w-0 break-words",
};
