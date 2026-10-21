/**
 * Composizioni della scheda di sottoscrittori e attuatori, costruite sulle
 * varianti condivise (campo, pillola, superficie, tabella) e sui soli ruoli
 * del tema. Le misure sono quelle del design "Modifica sottoscrittore".
 */
import { campo, etichetta, sceltaInLinea, sceltaRiquadro } from "./campo.js";
import { pillola } from "./pillola.js";
import {
  separatoreTratteggiato,
  titoloSezioneModulo,
} from "./superficie.js";
import { statoVuoto } from "./tabella.js";

// Classi statiche: Tailwind non vede quelle composte a runtime. Stessa regola
// di CampoModulo, per i campi scritti a mano nella griglia di 6.
const COLONNE = {
  1: "col-span-6 sm:col-span-1",
  2: "col-span-6 sm:col-span-2",
  3: "col-span-6 sm:col-span-3",
  4: "col-span-6 sm:col-span-4",
  5: "col-span-6 sm:col-span-5",
  6: "col-span-6",
};

const GRIGLIA_AUTO =
  "grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))]";

export const STILI_ANAGRAFICA = {
  // Esito del salvataggio, portato in vista: sotto i 1024px resta sotto la
  // barra superiore agganciata, piu' 16px di respiro.
  riquadroAvviso: "scroll-mt-[calc(var(--spacing-barra-superiore)+1rem)] lg:scroll-mt-4",
  // Testata: nome, codice fiscale in monospazio 13px, pillola dello stato.
  nomeTestata: "whitespace-nowrap font-medium text-testo",
  codiceTestata: "font-mono text-dettaglio",
  // Scheda senza dati (esami di un'anagrafica non salvata o assenti) e
  // ripiego delle schede non previste.
  // Interlinea normale come nel design (text-sm porterebbe 20px).
  vuoto: `${statoVuoto()} leading-[normal]`,
  titoloVuoto: "mb-2 text-titolo-sezione text-testo",
  schedaCorrente: "font-medium text-primario capitalize",
  errore: "px-8 py-14 text-center text-sm text-negativo",
  // Griglia di 6 dentro una scheda evidenziata (diploma).
  grigliaCampi: "grid grid-cols-6 gap-x-5 gap-y-4.5",
  // Parte facoltativa sotto il tratteggio: anno integrativo.
  parteFacoltativa: `${separatoreTratteggiato()} flex flex-col gap-3.5`,
  grigliaSecondaria: "grid grid-cols-6 gap-x-4 gap-y-3.5",
  // Didascalia di un gruppo di campi: "Altri recapiti", "Anno integrativo".
  didascalia: "text-xs leading-[normal] font-medium text-testo-attenuato",
  // Voto ricevuto e massimo sulla stessa riga, separati da "/".
  voto: "flex items-center gap-2",
  separatoreVoto: "text-testo-attenuato",
  // Tabella "Altri titoli": nome della riga.
  titoloRiga: "text-dettaglio text-testo-secondario",
  // Contatti: colonna dei campi, schede di email e cellulare, altri recapiti.
  colonnaContatti: "flex flex-col gap-5",
  messaggiContatti: "flex flex-col gap-3 empty:hidden",
  messaggioAttivazione: "text-sm text-testo-tenue",
  grigliaRecapiti: `${GRIGLIA_AUTO} gap-4`,
  schedaRecapito:
    "flex min-w-0 flex-col gap-2.5 rounded-evidenza border border-evidenza-bordo bg-evidenza px-4.5 py-4",
  // Testata alta quanto la pillola "Verificata" (21px): il pulsante "Verifica"
  // (32px) sborda con un margine negativo, cosi' i campi di email e cellulare
  // restano alla stessa altezza qualunque sia lo stato della verifica.
  testataRecapito: "flex min-h-5.25 items-center justify-between gap-2",
  pulsanteRecapito: "-my-1.5",
  etichettaRecapito:
    "text-xs leading-[normal] font-semibold uppercase tracking-wider text-primario",
  spuntaRecapito: "size-3 shrink-0",
  altriRecapiti: "flex flex-col gap-3",
  grigliaAltriRecapiti: `${GRIGLIA_AUTO} gap-x-5 gap-y-4`,
  campoSecondario: "flex min-w-0 flex-col",
  // Curriculum: casella a tutta riga, caselle a scheda, suffisso "%".
  // Interlinea normale come nel design: la riga resta alta quanto la casella.
  sceltaIscrizione: `${sceltaInLinea()} col-span-6 leading-[normal]`,
  sceltaConvalida: `${sceltaRiquadro()} leading-[normal]`,
  grigliaConvalida: "grid grid-cols-[repeat(auto-fit,minmax(min(100%,10.625rem),1fr))] gap-3",
  conSuffisso: "relative",
  // Utente: stato cliccabile, riquadro del padre, azioni, cronologia.
  cellaStato: "flex h-controllo items-center",
  riquadroPadre:
    "flex h-controllo items-center justify-between gap-2.5 rounded-controllo border border-bordo " +
    "bg-superficie-tenue pr-1 pl-3.5",
  nomePadre: "truncate text-sm font-medium text-testo",
  azioniUtente: "col-span-6 flex flex-wrap items-center justify-end gap-3",
  // Finestra "Cambia padre": testata, ricerca e ruolo, elenco che scorre con
  // l'intestazione ferma, stato del caricamento sotto.
  testataPadre: "mb-4 flex items-center justify-between gap-3 border-b border-divisore pb-2.5",
  titoloPadre: "text-titolo-evidenziato text-testo",
  filtriPadre: "mb-4 flex flex-col gap-3 sm:flex-row",
  ruoloPadre: "sm:w-56 sm:shrink-0",
  elencoPadri: "min-h-0 flex-1 overflow-y-auto rounded-riquadro border border-bordo bg-superficie",
  intestazionePadri: "sticky top-0 z-10",
  // Sotto i 768px niente scorrimento orizzontale: due colonne, l'attuatore
  // (cognome e nome, sotto ruolo e centro) e "Seleziona"; da 768px le cinque
  // colonne. `!` perche' cella() fissa gia' white-space.
  colonnaStrettaPadre: "md:hidden",
  colonnaLargaPadre: "hidden md:table-cell",
  cellaAttuatorePadre: "whitespace-normal! md:hidden",
  nomeAttuatorePadre: "block font-medium text-testo",
  dettaglioAttuatorePadre: "block text-dettaglio text-testo-tenue",
  // Nome, cognome, ruolo e centro vanno a capo: a 768px, con le cinque
  // colonne, la tabella scorrerebbe di lato.
  cellaTestoPadre: "whitespace-normal! break-words",
  cellaAzionePadre: "w-px text-right",
  statoPadri: "mt-2 min-h-5 text-center text-nota text-testo-tenue",
  barraAzioni: "flex-wrap",
  azioniSalvataggio: "ml-auto flex flex-wrap items-center justify-end gap-3",
  avvisoUtente: "px-6 pt-6 sm:px-8",
  cronologia: "grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-4",
  valoreCronologia: "text-sm leading-[normal] text-testo",
  // Centro dell'attuatore nel pannello: ragione sociale con la freccia e i
  // comandi, poi i dati su due colonne; senza centro, la ricerca per
  // partita IVA.
  centro: "flex flex-col gap-6",
  testataCentro: "flex flex-wrap items-center justify-between gap-4",
  azioniCentro: "flex flex-wrap gap-3",
  testoCentro: "text-sm text-testo-tenue",
  ricercaCentro: "flex max-w-sm flex-col gap-4",
  azioniRicercaCentro: "flex flex-wrap gap-3",
  titoloCentro: "text-titolo-evidenziato text-testo",
  datiCentro: "grid grid-cols-1 gap-x-5 gap-y-4.5 sm:grid-cols-2",
  etichettaDato: etichetta(),
  valoreDato: "text-sm text-testo break-words",
  // Esami del sottoscrittore: testata con "Aggiungi esame", tabella a tutta
  // larghezza, finestra di aggiunta e modifica.
  esami: "flex flex-col gap-5",
  testataEsami: "flex flex-wrap items-center justify-between gap-4",
  titoloEsami: titoloSezioneModulo(),
  // Tabella a tutta larghezza e senza scorrimento: colonne fisse dove il
  // contenuto e' corto, i testi lunghi vanno a capo. Sotto i 896px della
  // scheda Data, SSD e Universita' scendono sotto l'insegnamento.
  contenitoreEsami: "w-full overflow-hidden rounded-riquadro border border-bordo bg-superficie",
  tabellaEsami: "w-full table-fixed text-left",
  dettagliEsame: "mt-0.5 block text-dettaglio font-normal text-testo-tenue @4xl:hidden",
  azioniEsame: "flex flex-col items-end gap-1.5 @md:flex-row @md:justify-end @md:gap-2",
  finestraEsame: "dialogo__contenuto gap-5 overflow-y-auto",
  testataFinestraEsame: titoloSezioneModulo(),
  pulsantiFinestraEsame: "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end",
  // Abilitazioni dell'attuatore: righe a scheda con interruttore.
  abilitazioni: "flex flex-col gap-3",
  rigaAbilitazione: `${sceltaRiquadro()} justify-between`,
};

// Classi statiche delle colonne della tabella esami: la larghezza vale per
// la cella d'intestazione (table-fixed la legge dalla prima riga); quelle
// con `hidden` compaiono solo da 896px di scheda in su. Nella tabella intera
// le larghezze sono in proporzione e tutto e' allineato a sinistra, cosi' lo
// spazio si divide fra le colonne invece di accumularsi in un punto;
// Universita' prende il resto.
const COLONNE_ESAMI = {
  data: "hidden @4xl:table-cell @4xl:w-[11%]",
  insegnamento: "@4xl:w-[25%]",
  ssd: "hidden @4xl:table-cell @4xl:w-[14%]",
  cfu: "w-16 @4xl:w-[8%]",
  voto: "w-16 @4xl:w-[8%]",
  universita: "hidden @4xl:table-cell",
  azioni: "w-15 @md:w-26 @4xl:w-28 text-right",
};

const TONI_CELLA_ESAME = {
  normale: "text-testo",
  forte: "font-semibold text-testo",
  tenue: "text-testo-tenue",
};

/**
 * Intestazione di una colonna della tabella esami.
 * @param {keyof typeof COLONNE_ESAMI} colonna
 */
export function intestazioneEsame(colonna) {
  return (
    `${COLONNE_ESAMI[colonna] ?? ""} px-3 py-2.5 @4xl:px-4 border-b border-bordo ` +
    "text-etichetta font-semibold uppercase tracking-wider whitespace-nowrap text-testo-tenue"
  );
}

/**
 * Cella della tabella esami: i testi lunghi vanno a capo, anche dentro una
 * parola che da sola non ci starebbe.
 * @param {keyof typeof COLONNE_ESAMI} colonna
 * @param {"normale"|"forte"|"tenue"} tono
 */
export function cellaEsame(colonna, tono = "normale") {
  const visibilita = COLONNE_ESAMI[colonna]?.includes("hidden") ? "hidden @4xl:table-cell" : "";
  const destra = COLONNE_ESAMI[colonna]?.includes("text-right") ? "text-right" : "";
  return (
    `${visibilita} ${destra} px-3 py-2.5 @4xl:px-4 align-middle text-sm wrap-anywhere ` +
    (TONI_CELLA_ESAME[tono] ?? TONI_CELLA_ESAME.normale)
  );
}

/** Cella di un campo scritto senza CampoModulo nella griglia di 6. */
export function colonnaCampo(colonne = 3) {
  return `flex min-w-0 flex-col ${COLONNE[colonne] ?? COLONNE[3]}`;
}

const TONI_NOTA = { neutra: "text-testo-tenue", avviso: "text-attenzione-nota" };

/**
 * Nota dentro la scheda di un recapito: lo spazio lo da' la scheda (gap 10),
 * l'interlinea e' quella del design (1,45).
 * @param {"neutra"|"avviso"} tono
 */
export function notaRecapito(tono = "neutra") {
  return `text-nota ${TONI_NOTA[tono] ?? TONI_NOTA.neutra}`;
}

/** Codice fiscale: campo del modulo in monospazio, ambra se ha un'anomalia. */
export function campoCodiceFiscale(avviso = false) {
  return `${campo("comodo", { avviso })} font-mono`;
}

/**
 * Data in evidenza ("Data conseguimento"): alta come il titolo accanto (46)
 * ma col testo dei campi normali (14/400), come nel design. La regola sulla
 * data vince sul corpo di `evidenziato` per specificita'.
 */
export function campoDataEvidenziata() {
  return `${campo("evidenziato")} [&[type=date]]:text-sm [&[type=date]]:font-normal`;
}

/**
 * Data in una colonna sola ("Abilitazioni"): rientro 6 e testo 13px per far
 * stare gg/mm/aaaa. `!` perche' la regola delle date di `campo()` ha una
 * specificita' maggiore.
 */
export function campoDataStretta() {
  return `${campo("comodo")} px-1.5! text-dettaglio!`;
}

/** Campo con l'unita' di misura dentro, a destra ("%"). */
export function campoConSuffisso() {
  return `${campo("comodo")} pr-7.5`;
}

/**
 * Stato dell'utente: pillola grande che si clicca per cambiarlo.
 * @param {boolean} attivo
 */
export function pillolaStato(attivo) {
  return (
    `${pillola(attivo ? "positivo" : "negativo", "grande")} cursor-pointer transition-colors ` +
    "disabled:cursor-not-allowed disabled:opacity-60 " +
    `${attivo ? "not-disabled:hover:bg-positivo-bordo" : "not-disabled:hover:bg-negativo-bordo"} ` +
    "focus:outline-none focus-visible:ring-3 focus-visible:ring-fuoco/30"
  );
}

/** Interruttore delle abilitazioni: binario primario se attivo. */
export function interruttore(attivo) {
  return (
    "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer " +
    "focus:outline-none focus-visible:ring-3 focus-visible:ring-fuoco/30 motion-reduce:transition-none " +
    (attivo ? "bg-primario" : "bg-testo-spento")
  );
}

/** Levetta dell'interruttore. */
export function levettaInterruttore(attivo) {
  return (
    "inline-block size-4 rounded-full bg-superficie transition-transform motion-reduce:transition-none " +
    (attivo ? "translate-x-6" : "translate-x-1")
  );
}
