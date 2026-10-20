/**
 * Ricette della sezione EduNews24: solo tipografia e colore dei testi interni
 * e comandi ERSAF adattati. Layout, forme, stati e container query stanno in
 * styles/edunews24.css (classi BEM), che vince sempre sulle utilita': su uno
 * stesso elemento una proprieta' non si dichiara in entrambi.
 *
 * Classi sempre intere, in tabelle di stringhe: Tailwind non vede le classi
 * composte a runtime ("text-edunews24-" + ruolo).
 */
import { pulsante, pulsanteIcona } from "./pulsante.js";
import { scheda } from "./superficie.js";

// Tagli dei titoli. `null`: la misura la decide la classe BEM del titolo,
// perche' cambia con il regime del contenitore (apertura e voce principale).
const TAGLI_TITOLO = {
  "apertura-grande": "text-edunews24-apertura-grande",
  apertura: "text-edunews24-apertura",
  "apertura-modulo": "text-edunews24-apertura-modulo",
  titolo: "text-edunews24-titolo",
  voce: "text-edunews24-voce",
  miniatura: "text-edunews24-miniatura",
};

// line-clamp solo visivo: il testo completo resta nel DOM.
const RIGHE = { 1: "line-clamp-1", 2: "line-clamp-2", 3: "line-clamp-3" };

const TONI_OCCHIELLO = {
  categoria: "text-edunews24-blu",
  ente: "text-testo-secondario",
};

// Titoli senza sillabazione automatica: con l'italiano e text-balance
// spezzava le parole dopo l'elisione ("dell'e-ducazione") e su piu' righe di
// fila. wrap-anywhere resta per i token lunghi (indirizzi, sigle).
const RITORNO_TESTO = "text-balance wrap-anywhere";

/**
 * Occhiello sopra il titolo: categoria (blu della testata) o ente. Iniziale
 * maiuscola, mai tutto maiuscolo.
 * @param {"categoria"|"ente"} tono
 */
export function occhiello(tono = "categoria") {
  return `text-edunews24-occhiello ${TONI_OCCHIELLO[tono] ?? TONI_OCCHIELLO.categoria}`;
}

/**
 * Testo del titolo di una voce, dentro il link (o il pulsante della
 * miniatura). Il colore passa a blu-intenso al passaggio sul controllo che
 * porta la classe `group`.
 * @param {"apertura-grande"|"apertura"|"apertura-modulo"|"titolo"|"voce"|"miniatura"|null} ruolo
 * @param {1|2|3} righe
 */
export function titoloVoce(ruolo, righe = 3) {
  return [
    TAGLI_TITOLO[ruolo] ?? "",
    "text-edunews24-inchiostro transition-colors group-hover:text-edunews24-blu-intenso",
    RITORNO_TESTO,
    RIGHE[righe] ?? RIGHE[3],
  ].filter(Boolean).join(" ");
}

/**
 * Sintesi della voce, al massimo 66 caratteri per riga.
 * @param {1|2|3} righe
 */
export function sintesi(righe = 2) {
  return `text-edunews24-sintesi text-testo-secondario text-pretty max-w-[66ch] ${RIGHE[righe] ?? RIGHE[2]}`;
}

/**
 * Riga dei metadati: data, luogo, area e "Fonte: EduNews24", separati da spazi
 * e mai da puntini. Cifre tabulari solo sulla data (STILI_EDUNEWS24.cifre): in
 * Inter la funzione allarga anche il trattino ("Emilia-Romagna").
 */
export function metaVoce() {
  return "flex flex-wrap items-center gap-x-3 gap-y-0.5 text-edunews24-meta text-testo-tenue";
}

/** Link interno della piattaforma ("Tutte le notizie"), nel viola ERSAF. Icona: ChevronRight con `iconaCollegamentoInterno()`. */
export function collegamentoInterno() {
  return (
    "inline-flex min-h-11 items-center gap-1.5 rounded-controllo px-2 text-sm font-medium text-primario " +
    "underline-offset-4 hover:underline"
  );
}

export function iconaCollegamentoInterno() {
  return "size-icona-piccola";
}

/**
 * "Riprova" degli stati d'errore. Con l'attesa di Retry-After il pulsante
 * resta nel tab order con aria-disabled: lo stile e' nella regola 4 del CSS.
 */
export function azioneRiprova() {
  return `${pulsante("secondario", "grande")} min-h-11`;
}

/** "Rimuovi filtri" e "Rimuovi il filtro". */
export function azioneRimuoviFiltri() {
  return `${pulsante("discreto", "normale")} min-h-11`;
}

/** "Rimuovi il filtro" dello stato vuoto della pagina: lo stesso comando di "Riprova". */
export function azioneVuoto() {
  return azioneRiprova();
}

/** Frecce della fascia del modulo: 44px, aria-disabled agli estremi. */
export function frecciaFascia() {
  return pulsanteIcona("neutro", "grande");
}

/** Involucro del modulo in Dashboard: scheda ERSAF, niente overflow-hidden. */
export function involucroModulo() {
  return `${scheda()} overflow-clip`;
}

/**
 * Foglio della pagina: scheda ERSAF con le schede. overflow-clip e non
 * overflow-hidden, altrimenti la barra dei filtri non resta in vista.
 */
export function foglio() {
  return `${scheda()} schede overflow-clip`;
}

/** Testi fissi della sezione, senza varianti. */
export const STILI_EDUNEWS24 = {
  presentazione: "text-edunews24-sintesi text-testo-secondario text-pretty",
  titoloGruppo: "text-edunews24-gruppo text-edunews24-inchiostro",
  dataGruppo: "text-edunews24-meta text-testo-tenue tabular-nums",
  titoloStato: "text-edunews24-voce text-edunews24-inchiostro text-balance",
  rigaStato: "text-edunews24-meta text-testo-secondario text-pretty",
  notaStato: "text-edunews24-meta text-testo-tenue",
  // Cifre tabulari solo su elementi numerici, come la data dei metadati: in
  // Inter la funzione allarga il trattino dei nomi composti del 41%.
  cifre: "tabular-nums",
  etichettaFiltri: "text-edunews24-meta text-testo-secondario",
  classe: "text-edunews24-occhiello text-testo-secondario tabular-nums",
  // Etichette dei controlli ERSAF della barra dei filtri ("Solo video", "Area").
  etichettaControllo: "text-sm font-medium text-testo-secondario",
  // Icone piccole dei filtri: Video accanto all'interruttore, X delle etichette.
  iconaPiccola: "size-icona-piccola shrink-0",
  // Colonna dell'area nelle righe di Interpelli, Selezione e Bandi della pagina.
  area: "text-edunews24-meta text-testo-secondario",
  // Frase "Da verificare" di un bando (NotaDaVerificare esteso), nel tono del
  // distintivo in attenzione; icona e allineamento in .edunews24-nota-verifica.
  notaVerifica: "text-edunews24-meta text-attenzione-forte text-pretty",
  // Nota sull'area della scheda Bandi, in cima al pannello; margine e misura
  // in .edunews24-pannello__nota.
  notaArea: "text-edunews24-meta text-testo-secondario text-pretty",
};
