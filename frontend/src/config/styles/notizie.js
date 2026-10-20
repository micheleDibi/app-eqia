/**
 * Composizioni delle notizie del Nazionale: elenco (PaginaNotizie.jsx),
 * scheda (SchedaNotizia.jsx), modulo (ModuloNotizia.jsx), finestra delle
 * sezioni (GestioneTag.jsx) e riquadro della Dashboard (RiquadroNotizie.jsx).
 * Il pannello della tendina dei destinatari sta in notizie.css.
 */
import { campo } from "./campo.js";
import { scheda } from "./superficie.js";
import { statoVuoto } from "./tabella.js";

const FUOCO = "focus:outline-none focus-visible:ring-3 focus-visible:ring-fuoco/30";
const FUOCO_INTERNO = "focus:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-fuoco/30";
const VOCE_FILTRO = "flex w-full cursor-pointer items-center justify-between gap-3 rounded-comando px-2.5 py-2 " +
  `text-left text-sm transition-colors ${FUOCO}`;

export const STILI_NOTIZIE = {
  // Elenco: una scheda per notizia, tutta cliccabile.
  elenco: "grid gap-3",
  voce: `${scheda()} block px-5 py-4 transition-colors hover:bg-riga-hover ${FUOCO_INTERNO}`,
  testataVoce: "flex flex-wrap items-center gap-2 text-dettaglio text-testo-tenue",
  titoloVoce: "mt-2 block text-titolo-sezione text-testo [overflow-wrap:anywhere]",
  // Notizia non ancora aperta: pallino rosso davanti al titolo, nell'elenco
  // e nella Dashboard.
  pallinoDaLeggere: "mr-2 inline-block size-2.5 rounded-full bg-negativo align-middle",
  sommarioVoce: "mt-1 block text-sm text-testo-secondario line-clamp-2 [overflow-wrap:anywhere]",
  vuoto: `${scheda()} ${statoVuoto()}`,

  pilloleVoce: "flex flex-wrap items-center gap-1.5",

  // Pannello Filtri dell'elenco (FiltriElenco), come un menu: la voce scelta
  // ha lo sfondo e la spunta a destra; gli argomenti della sezione aperta
  // rientrano sotto di lei, lungo una linea sottile.
  vociFiltro: "grid gap-0.5",
  argomentiFiltro: "my-0.5 ml-3.5 grid gap-0.5 border-l border-divisore pl-2",
  voceFiltro: `${VOCE_FILTRO} text-testo hover:bg-riga-hover`,
  voceFiltroScelta: `${VOCE_FILTRO} bg-primario-tenue font-medium text-primario`,
  nomeVoceFiltro: "inline-flex min-w-0 items-center gap-1.5 [overflow-wrap:anywhere]",
  // Accanto alle sezioni con argomenti: in giu' se aperta, a destra se chiusa.
  frecciaFiltro: "size-3.5 shrink-0 opacity-60",
  spuntaFiltro: "size-4 shrink-0",

  // Scheda: in alto la foto a sinistra e le informazioni a destra (una
  // sotto l'altra sugli schermi stretti, solo le informazioni senza foto),
  // sotto l'articolo a tutta larghezza, poi link e allegati.
  barraScheda: "mb-5 flex flex-wrap items-center justify-between gap-3",
  azioniScheda: "flex flex-wrap items-center gap-2",
  corpo: `${scheda()} overflow-clip`,
  testataConFoto: "grid gap-6 px-6 py-7 sm:px-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-stretch md:gap-8",
  testataSenzaFoto: "grid px-6 py-7 sm:px-8",
  // L'immagine intera, con le sue proporzioni e mai ingrandita: al massimo
  // larga quanto la sua colonna e alta 360px.
  cornice: "flex items-start justify-center md:justify-start",
  immagine: "block h-auto max-h-[360px] w-auto min-w-0 max-w-full rounded-riquadro object-contain",
  // La colonna e' alta quanto la foto: le informazioni partono dal bordo
  // alto, gli allegati stanno in fondo, al bordo basso.
  colonnaInformazioni: "flex min-w-0 flex-col gap-6 md:justify-between",
  informazioni: "grid content-start gap-3",
  pilloleScheda: "flex flex-wrap items-center gap-1.5",
  titoloNotizia: "text-titolo-pagina text-primario text-balance [overflow-wrap:anywhere]",
  sottotitolo: "text-base leading-relaxed text-testo-secondario [overflow-wrap:anywhere]",
  datiNotizia: "flex flex-wrap items-center gap-x-3 gap-y-1 text-dettaglio text-testo-tenue",
  contenuto: "grid gap-5 border-t border-divisore px-6 py-7 sm:px-8",
  testo: "max-w-[72ch] whitespace-pre-line text-[0.9375rem] leading-7 text-testo [overflow-wrap:anywhere]",
  link: "inline-flex items-center gap-1.5 self-start text-sm font-medium text-primario underline-offset-4 " +
    `hover:underline rounded-controllo ${FUOCO}`,
  sezioneAllegati: "grid gap-2.5 border-t border-divisore pt-4",
  titoloAllegati: "text-etichetta uppercase tracking-wider text-testo-tenue",
  elencoAllegati: "flex flex-wrap gap-2",
  allegatoScheda: "max-w-full min-w-0",
  piede: "border-t border-divisore px-6 py-4 text-dettaglio text-testo-tenue sm:px-8",

  // Modulo.
  testoLungo: `${campo("comodo")} min-h-48 leading-relaxed`,
  anteprima: "max-h-48 max-w-full rounded-riquadro border border-bordo object-contain",
  rigaFile: "col-span-6 flex flex-wrap items-center gap-3",
  allegati: "col-span-6 grid gap-2",
  allegato: "flex items-center justify-between gap-3 rounded-riquadro border border-bordo px-3 py-2 text-sm text-testo",
  nomeAllegato: "min-w-0 [overflow-wrap:anywhere]",
  daCaricare: "ml-2 text-dettaglio text-testo-tenue",
  nessunAllegato: "col-span-6 text-sm text-testo-tenue",
  // Tendina dei gruppi: il comando ha l'aspetto di una select.
  comandoGruppi: `${campo("comodo")} flex items-center justify-between gap-2 text-left`,
  frecciaGruppi: "size-4 shrink-0 text-testo-tenue",
  opzioneGruppo: "flex cursor-pointer items-center gap-2.5 rounded-comando px-2 py-2 text-sm text-testo hover:bg-riga-hover",
  casellaGruppo: "size-4 accent-primario",

  // Finestra "Sezioni e argomenti" (GestioneTag.jsx): testata con titolo
  // 18/600 e chiusura da 36px bordata, come le finestre di scelta.
  testataFinestra: "flex shrink-0 items-center justify-between gap-3 px-6 pt-5 pb-3.5",
  titoloFinestra: "text-lg leading-[normal] font-semibold text-testo",
  chiudiFinestra: "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border " +
    `border-bordo-controllo bg-superficie text-testo-tenue transition-colors hover:bg-superficie-alta ${FUOCO}`,
  iconaChiudiFinestra: "size-4",
  corpoTag: "flex min-h-0 flex-auto flex-col gap-4 overflow-y-auto px-6 pb-6",
  descrizioneTag: "text-sm text-testo-tenue",
  nuovoTag: "grid gap-1.5",
  nuovoSottotag: "mt-3 grid gap-1",
  etichettaNuovo: "text-etichetta uppercase tracking-wider text-testo-tenue",
  rigaNuovo: "flex flex-wrap gap-2",
  campoNuovo: `${campo("compatto")} flex-[1_1_14rem]`,
  erroreNuovo: "text-dettaglio text-negativo",
  elencoTag: "grid gap-3",
  voceTag: "rounded-riquadro border border-bordo px-4 py-3.5",
  testataTag: "flex flex-wrap items-center gap-2",
  nomeTag: "text-titolo-sezione text-testo",
  nomeTagSpento: "text-titolo-sezione text-testo-tenue line-through decoration-1",
  elencoSottotag: "mt-2 grid gap-0.5 border-l-2 border-divisore pl-3",
  voceSottotag: "flex flex-wrap items-center gap-2 py-0.5",
  nomeSottotag: "text-sm text-testo",
  nomeSottotagSpento: "text-sm text-testo-tenue line-through decoration-1",
  nessunSottotag: "mt-2 text-sm text-testo-tenue",

  // Riquadro della Dashboard: le ultime notizie, ognuna apre la sua scheda.
  riquadro: `${scheda()} overflow-clip`,
  testataRiquadro: "flex flex-wrap items-center justify-between gap-3 border-b border-divisore px-5 py-3.5",
  titoloRiquadro: "flex items-center gap-2 text-titolo-sezione text-testo",
  iconaRiquadro: "size-4 text-primario",
  tutte: `text-sm font-medium text-primario underline-offset-4 hover:underline rounded-controllo ${FUOCO}`,
  vociRiquadro: "divide-y divide-divisore",
  voceRiquadro: `block px-5 py-3.5 transition-colors hover:bg-riga-hover ${FUOCO_INTERNO}`,
};
