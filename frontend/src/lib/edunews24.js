// Logica pura della sezione EduNews24: date di Roma, stati delle scadenze,
// aree, filtri, percorsi dell'API, lettura delle risposte e impaginazione.
// "adesso" e' sempre un parametro (millisecondi o istante): niente orologio qui.
import {
  AREA_NAZIONALE,
  AREE_EDUNEWS24,
  CICLO_BANDE,
  FILTRI_PER_SEZIONE,
  PENDENZA_BORDATO,
  PENDENZA_PIENO,
  PERCORSO_SEGNAPOSTO,
  POSIZIONI_BANDOFIT,
  REGIONI_EDUNEWS24,
  SECONDARIE_PRIMA_PAGINA,
  SEZIONE_PREDEFINITA,
  SEZIONI_EDUNEWS24,
  SOGLIA_ATTENZIONE_GIORNI,
  TIPI_VIDEO,
  URL_BANDOFIT,
  VOCI_BANDI_MODULO,
  VOCI_OPPORTUNITA_MODULO,
  cursoreValido,
  slugCategoriaValido,
} from "../config/edunews24.js";
import { TESTI_EDUNEWS24 as testi } from "../config/testi/edunews24.js";
import { ROTTE } from "../config/routes/percorsi.js";
import { secondiAttesa } from "./erroriApi.js";

// Le date si leggono sempre come in sede, qualunque sia il fuso del dispositivo.
const FUSO = "Europe/Rome";
const GIORNO_MS = 86_400_000;

// Formattatori creati una volta sola. I giorni "AAAA-MM-GG" (scadenze e giorni
// gia' riportati a Roma) si formattano in UTC, cosi' non cambiano mai giorno.
const GIORNO_ROMA = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });
const ORA_ROMA = new Intl.DateTimeFormat("it-IT", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const SETTIMANA = new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const SETTIMANA_ANNO = new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const MESE_BREVE = new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", month: "short" });
const MESE_ESTESO = new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", month: "long" });

const RISORSE = Object.freeze({
  notizie: "/edunews24/notizie",
  interpelli: "/edunews24/interpelli",
  "selezione-personale": "/edunews24/selezione-personale",
  bandi: "/edunews24/bandi",
});
const REGIONI_PER_SLUG = new Map(REGIONI_EDUNEWS24.map((regione) => [regione.slug, regione.nome]));
const STATI_OPPORTUNITA = ["aperto", "chiuso", "altro"];
// Valori di StatoBando e MotivoDaVerificare del backend (schemi.py).
const STATI_BANDO = ["aperto", "in-apertura", "chiuso", "sospeso", "revocato", "altro"];
const MOTIVI_DA_VERIFICARE = [
  "data-apertura-passata",
  "smentito-dalla-fonte",
  "previsione-scaduta",
  "senza-conferma",
  "termine-passato",
];
// Parametri fissi del link a BandoFit; utm_content e' la posizione.
const UTM_BANDOFIT = Object.freeze({ utm_source: "piattaforma-universita", utm_medium: "cta", utm_campaign: "bandi" });

const due = (n) => String(n).padStart(2, "0");
const maiuscolaIniziale = (testo) => testo.charAt(0).toUpperCase() + testo.slice(1);
const interoPositivo = (valore) => Number.isSafeInteger(valore) && valore > 0;
const testoPieno = (valore) => (typeof valore === "string" && valore.trim() !== "" ? valore : null);

function istante(valore) {
  if (valore === null || valore === undefined || valore === "") return null;
  const data = valore instanceof Date ? valore : new Date(valore);
  return Number.isNaN(data.getTime()) ? null : data;
}

// --- date --------------------------------------------------------------------

/** Giorno di calendario di Roma "AAAA-MM-GG" di un istante, oppure null. */
export function giornoRoma(valore) {
  const data = istante(valore);
  if (!data) return null;
  const parti = Object.fromEntries(GIORNO_ROMA.formatToParts(data).map(({ type, value }) => [type, value]));
  return `${parti.year}-${parti.month}-${parti.day}`;
}

/** Numero progressivo del giorno "AAAA-MM-GG", null se la data non esiste. */
export function numeroGiorno(giorno) {
  if (typeof giorno !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(giorno)) return null;
  const [anno, mese, di] = giorno.split("-").map(Number);
  const millisecondi = Date.UTC(anno, mese - 1, di);
  const verifica = new Date(millisecondi);
  if (verifica.getUTCFullYear() !== anno || verifica.getUTCMonth() !== mese - 1 || verifica.getUTCDate() !== di) return null;
  return millisecondi / GIORNO_MS;
}

/** Giorni di calendario di Roma fra oggi e la scadenza; negativi se passata. */
export function giorniAllaScadenza(scadenza, adesso) {
  const fine = numeroGiorno(scadenza);
  const oggi = numeroGiorno(giornoRoma(adesso));
  return fine === null || oggi === null ? null : fine - oggi;
}

/** "gg/mm/aaaa" del giorno di Roma di un istante. */
export function formattaData(valore) {
  const giorno = giornoRoma(valore);
  return giorno ? formattaGiorno(giorno) : null;
}

/** "gg/mm/aaaa" di un giorno "AAAA-MM-GG", senza passare dal fuso. */
export function formattaGiorno(giorno) {
  if (numeroGiorno(giorno) === null) return null;
  const [anno, mese, di] = giorno.split("-");
  return `${di}/${mese}/${anno}`;
}

/** "hh:mm" di Roma di un istante. */
export function formattaOra(valore) {
  const data = istante(valore);
  if (!data) return null;
  const parti = Object.fromEntries(ORA_ROMA.formatToParts(data).map(({ type, value }) => [type, value]));
  return `${due(Number(parti.hour) % 24)}:${parti.minute}`;
}

/**
 * Parti di un giorno "AAAA-MM-GG" per timbri e targhe: "15", "ott", "ottobre",
 * "2026", e le forme estese "15 ottobre" e "15 ottobre 2026".
 */
export function partiGiorno(giorno) {
  const numero = numeroGiorno(giorno);
  if (numero === null) return null;
  const data = new Date(numero * GIORNO_MS);
  const di = String(data.getUTCDate());
  const anno = String(data.getUTCFullYear());
  const meseEsteso = MESE_ESTESO.format(data);
  return {
    giorno: di,
    mese: MESE_BREVE.format(data).replace(".", ""),
    meseEsteso,
    anno,
    estesoSenzaAnno: `${di} ${meseEsteso}`,
    esteso: `${di} ${meseEsteso} ${anno}`,
  };
}

/** "Oggi", "Ieri", oppure "Lunedì 28 settembre" (con l'anno se diverso); un giorno futuro e' sempre una data. */
export function etichettaGiorno(giorno, oggi) {
  const numero = numeroGiorno(giorno);
  if (numero === null) return testi.senzaData;
  const riferimento = numeroGiorno(oggi);
  if (riferimento !== null && numero === riferimento) return testi.oggi;
  if (riferimento !== null && riferimento - numero === 1) return testi.ieri;
  const stessoAnno = riferimento !== null && giorno.slice(0, 4) === oggi.slice(0, 4);
  return maiuscolaIniziale((stessoAnno ? SETTIMANA : SETTIMANA_ANNO).format(new Date(numero * GIORNO_MS)));
}

/** Data di pubblicazione di una voce: { iso, testo } con "Oggi", "Ieri" o "gg/mm/aaaa". */
export function dataVoce(voce, adesso) {
  const giorno = giornoRoma(voce?.pubblicato_il);
  if (!giorno) return null;
  const distanza = numeroGiorno(giornoRoma(adesso)) - numeroGiorno(giorno);
  const testo = distanza === 0 ? testi.oggi : distanza === 1 ? testi.ieri : formattaGiorno(giorno);
  return { iso: voce.pubblicato_il, testo };
}

/**
 * Testo del folio: "Aggiornato alle 10:32", "Aggiornato il 27/09 alle 18:00" o,
 * con la copia stantia, "Non aggiornato dalle..." con la frase estesa per i
 * lettori di schermo. Una copia stantia senza istante dice solo "Contenuti non
 * aggiornati", e cosi' un primo caricamento fallito senza copia (`errore`),
 * senza frase estesa: l'avviso d'errore spiega gia'. Null quando non c'e'
 * nulla da dire.
 */
export function descriviAggiornamento(aggiornatoIl, stantio, adesso, errore = false) {
  const esteso = stantio ? testi.stantioEsteso : null;
  const giorno = giornoRoma(aggiornatoIl);
  if (!giorno) return stantio || errore ? { iso: null, testo: testi.nonAggiornato, esteso } : null;
  const ora = formattaOra(aggiornatoIl);
  const oggi = giornoRoma(adesso);
  const iso = istante(aggiornatoIl).toISOString();
  if (giorno === oggi) {
    return { iso, testo: stantio ? testi.nonAggiornatoDalle(ora) : testi.aggiornatoAlle(ora), esteso };
  }
  const [anno, mese, di] = giorno.split("-");
  const data = oggi && oggi.slice(0, 4) === anno ? `${di}/${mese}` : `${di}/${mese}/${anno}`;
  return { iso, testo: stantio ? testi.nonAggiornatoDal(data, ora) : testi.aggiornatoIl(data, ora), esteso };
}

// --- stato della selezione --------------------------------------------------

/**
 * Distintivo di stato della selezione del personale: null per gli interpelli e
 * per gli stati "altro" e sconosciuti (ramo neutro: la scadenza resta visibile).
 * Una scadenza passata vale "Scaduto" anche se la copia dice ancora "aperto".
 */
export function statoOpportunita(voce, adesso) {
  if (voce?.tipo !== "selezione-personale") return null;
  const giorni = giorniAllaScadenza(voce.scadenza, adesso);
  if (giorni !== null && giorni < 0) return { chiave: "scaduto", testo: testi.stati.scaduto, tono: "neutro", giorni };
  if (voce.stato === "chiuso") return { chiave: "chiuso", testo: testi.stati.chiuso, tono: "neutro", giorni };
  if (voce.stato !== "aperto") return null;
  if (giorni === null) return { chiave: "aperto", testo: testi.stati.aperto, tono: "aperto", giorni };
  const tono = giorni <= SOGLIA_ATTENZIONE_GIORNI ? "attenzione" : "aperto";
  if (giorni === 0) return { chiave: "scade-oggi", testo: testi.stati.scadeOggi, tono, giorni };
  if (giorni === 1) return { chiave: "scade-domani", testo: testi.stati.scadeDomani, tono, giorni };
  return { chiave: "scade-tra", testo: testi.stati.scadeTra(giorni), tono, giorni };
}

/** Tono della targa della scadenza: segue il distintivo, "normale" senza. */
export function tonoTarga(stato) {
  if (stato?.tono === "attenzione") return "attenzione";
  if (stato?.tono === "neutro") return "neutro";
  return "normale";
}

export function voceChiusaOScaduta(voce, adesso) {
  const giorni = giorniAllaScadenza(voce?.scadenza, adesso);
  return voce?.stato === "chiuso" || (giorni !== null && giorni < 0);
}

// --- stato dei bandi ---------------------------------------------------------

// Distintivi con la targa neutra (anche "sospeso", che come distintivo e' in
// attenzione) e distintivi che ammettono la nota "Da verificare".
const CHIAVI_TARGA_NEUTRA = ["revocato", "sospeso", "chiuso", "scaduto"];
const CHIAVI_DA_VERIFICARE = ["aperto", "scade-oggi", "scade-domani", "scade-tra", "in-apertura", "apre-il"];
const MIGLIAIA = /\B(?=(\d{3})+(?!\d))/g;
// Spazio non separabile (U+00A0) prima di "€", come in formatoEuro.
const SPAZIO_EURO = String.fromCharCode(0xa0);

const annoDi = (adesso) => giornoRoma(adesso)?.slice(0, 4);

/**
 * Distintivo di stato di un bando: { chiave, testo, tono, giorni } oppure null
 * (stato "altro" o assente). `giorni` sono i giorni di Roma alla scadenza, come
 * in statoOpportunita. Revocato, sospeso e chiuso vengono prima della
 * scadenza; aperto e in apertura con la scadenza passata sono "Scaduto". In
 * apertura ha il tono informazione: con l'apertura futura "Apre il 3 nov"
 * (l'anno solo se diverso), oppure "In apertura" con `conData: false`.
 */
export function statoBando(voce, adesso, { conData = true } = {}) {
  if (voce?.tipo !== "bando") return null;
  const giorni = giorniAllaScadenza(voce.scadenza, adesso);
  if (voce.stato === "revocato") return { chiave: "revocato", testo: testi.statiBando.revocato, tono: "neutro", giorni };
  if (voce.stato === "sospeso") return { chiave: "sospeso", testo: testi.statiBando.sospeso, tono: "attenzione", giorni };
  if (voce.stato === "chiuso") return { chiave: "chiuso", testo: testi.stati.chiuso, tono: "neutro", giorni };
  if (voce.stato !== "aperto" && voce.stato !== "in-apertura") return null;
  if (giorni !== null && giorni < 0) return { chiave: "scaduto", testo: testi.stati.scaduto, tono: "neutro", giorni };
  if (voce.stato === "in-apertura") {
    const allApertura = giorniAllaScadenza(voce.apertura, adesso);
    if (allApertura === null || allApertura <= 0) {
      return { chiave: "in-apertura", testo: testi.statiBando.inApertura, tono: "informazione", giorni };
    }
    const apertura = partiGiorno(voce.apertura);
    const data = apertura.anno === annoDi(adesso) ? `${apertura.giorno} ${apertura.mese}` : `${apertura.giorno} ${apertura.mese} ${apertura.anno}`;
    const testo = conData ? testi.statiBando.apreIl(data) : testi.statiBando.inApertura;
    return { chiave: "apre-il", testo, tono: "informazione", giorni };
  }
  if (giorni === null) return { chiave: "aperto", testo: testi.stati.aperto, tono: "aperto", giorni };
  const tono = giorni <= SOGLIA_ATTENZIONE_GIORNI ? "attenzione" : "aperto";
  if (giorni === 0) return { chiave: "scade-oggi", testo: testi.stati.scadeOggi, tono, giorni };
  if (giorni === 1) return { chiave: "scade-domani", testo: testi.stati.scadeDomani, tono, giorni };
  return { chiave: "scade-tra", testo: testi.stati.scadeTra(giorni), tono, giorni };
}

/**
 * Nota "Da verificare" di un bando: { motivo, etichetta, testo } oppure null.
 * Solo con un distintivo aperto, in scadenza o in apertura; la frase e' quella
 * della coppia stato e motivo, `generico` fuori dalla tabella.
 */
export function daVerificareBando(voce, adesso) {
  const motivo = voce?.da_verificare;
  if (!MOTIVI_DA_VERIFICARE.includes(motivo)) return null;
  if (!CHIAVI_DA_VERIFICARE.includes(statoBando(voce, adesso)?.chiave)) return null;
  const frasi = testi.daVerificare.motivi[voce.stato];
  const testo = frasi && Object.hasOwn(frasi, motivo) ? frasi[motivo] : testi.daVerificare.generico;
  return { motivo, etichetta: testi.daVerificare.etichetta, testo };
}

/**
 * Giorno del timbro della voce principale dei bandi nel modulo: l'apertura
 * solo con il distintivo "apre-il", altrimenti la scadenza, altrimenti il
 * giorno di Roma della pubblicazione; null senza nessuna data valida.
 */
export function dataTimbroBando(voce, adesso) {
  if (statoBando(voce, adesso)?.chiave === "apre-il") return { tipo: "apertura", giorno: voce.apertura };
  if (numeroGiorno(voce?.scadenza) !== null) return { tipo: "scadenza", giorno: voce.scadenza };
  const giorno = giornoRoma(voce?.pubblicato_il);
  return giorno ? { tipo: "pubblicazione", giorno } : null;
}

/**
 * Prop di Targa per un bando, come la targa della selezione: la data di
 * apertura con il distintivo "apre-il", altrimenti la scadenza ("15 ott", con
 * l'anno solo se diverso), altrimenti "Senza scadenza"; mai la pubblicazione.
 * Tono neutro per revocato, sospeso, chiuso e scaduto, attenzione per le
 * scadenze vicine, altrimenti normale.
 */
export function targaBando(voce, stato, adesso) {
  const chiave = stato?.chiave;
  const vicina = typeof chiave === "string" && chiave.startsWith("scade-") && stato.tono === "attenzione";
  const tono = CHIAVI_TARGA_NEUTRA.includes(chiave) ? "neutro" : vicina ? "attenzione" : "normale";
  const apertura = chiave === "apre-il" ? partiGiorno(voce?.apertura) : null;
  const data = apertura ?? partiGiorno(voce?.scadenza);
  if (!data) return { tono, etichetta: testi.senzaScadenza, sr: testi.scadenzaNonIndicata };
  return {
    tono,
    cifra: data.giorno,
    mese: data.mese,
    anno: data.anno === annoDi(adesso) ? undefined : data.anno,
    sr: apertura ? testi.aperturaSr(data.esteso) : testi.scadenzaSr(data.esteso),
  };
}

/**
 * Importo intero in euro senza decimali: "1.000 €", "90.000.000 €", con il
 * punto anche a 4 cifre e lo spazio non separabile (U+00A0) prima del
 * simbolo, come formatoEuro. Null se non e' un intero positivo.
 */
export function euroSenzaDecimali(valore) {
  if (!interoPositivo(valore)) return null;
  return `${String(valore).replace(MIGLIAIA, ".")}${SPAZIO_EURO}€`;
}

// --- aree --------------------------------------------------------------------

export function nomeArea(area) {
  if (area === AREA_NAZIONALE) return testi.nazionale;
  return REGIONI_PER_SLUG.get(area) ?? null;
}

/**
 * Area di un'opportunita': "Nazionale", oppure le regioni riconosciute senza
 * doppioni, le prime `massimo` per nome e le altre in `altre` (per il "+N").
 */
export function descriviArea(voce, massimo) {
  if (!Number.isInteger(massimo) || massimo < 1) throw new TypeError("Numero di regioni non valido");
  if (voce?.nazionale === true) return { nazionale: true, visibili: [testi.nazionale], altre: [], tutte: [testi.nazionale] };
  const tutte = [...new Set((Array.isArray(voce?.regioni) ? voce.regioni : [])
    .map((regione) => REGIONI_PER_SLUG.get(regione?.slug))
    .filter(Boolean))];
  if (tutte.length === 0) return null;
  return { nazionale: false, visibili: tutte.slice(0, massimo), altre: tutte.slice(massimo), tutte };
}

/**
 * Area di un bando: come descriviArea, ma un bando non nazionale rivolto a
 * tutte le regioni (per esempio un europeo) e' "Tutte le regioni", non un
 * elenco con il "+N". Stessa forma, per testoArea e testoAreaAccessibile.
 */
export function descriviAreaBando(voce, massimo) {
  const area = descriviArea(voce, massimo);
  if (area && !area.nazionale && area.tutte.length === REGIONI_EDUNEWS24.length) {
    return { nazionale: false, visibili: [testi.tutteLeRegioni], altre: [], tutte: [testi.tutteLeRegioni] };
  }
  return area;
}

/** Testo visibile: "Lombardia, Veneto +2". */
export function testoArea(area) {
  if (!area) return "";
  const visibili = area.visibili.join(", ");
  return area.altre.length ? `${visibili} ${testi.altreRegioni(area.altre.length)}` : visibili;
}

/** Testo per i lettori di schermo: "Lombardia, Veneto e altre 2: Liguria, Piemonte". */
export function testoAreaAccessibile(area) {
  if (!area) return "";
  const visibili = area.visibili.join(", ");
  return area.altre.length ? `${visibili} ${testi.altreRegioniSr(area.altre.length, area.altre.join(", "))}` : visibili;
}

// --- filtri e query della pagina ---------------------------------------------

/** Aree che il filtro della scheda ammette: nessuna per le notizie, "nazionale" solo nella selezione e nei bandi. */
export function areeAmmesse(sezione) {
  if (sezione === "selezione-personale" || sezione === "bandi") return AREE_EDUNEWS24;
  if (sezione === "interpelli") return AREE_EDUNEWS24.filter((area) => area !== AREA_NAZIONALE);
  return [];
}

/** Azzera i filtri che la scheda non ammette; una combinazione non ammessa vale "tutte". */
export function filtriAmmessi(sezione, valori = {}) {
  const ammessi = FILTRI_PER_SEZIONE[sezione] ?? [];
  return {
    categoria: ammessi.includes("categoria") && slugCategoriaValido(valori.categoria) ? valori.categoria : "",
    video: ammessi.includes("video") && valori.video === "1" ? "1" : "",
    area: ammessi.includes("area") && areeAmmesse(sezione).includes(valori.area) ? valori.area : "",
  };
}

/** Modifiche della query al cambio di scheda: sempre tutte le chiavi. */
export function modificheCambioScheda(da, a, valori = {}) {
  return { scheda: a, ...filtriAmmessi(a, valori) };
}

export function azzeramentoFiltri() {
  return { categoria: "", video: "", area: "" };
}

/**
 * Filtri attivi come etichette rimovibili: testo visibile ("Categoria: Scuola")
 * e nome del pulsante ("Rimuovi il filtro Categoria: Scuola").
 */
export function filtriAttivi(sezione, valori = {}, categorie = []) {
  const filtri = filtriAmmessi(sezione, valori);
  const attivi = [];
  if (filtri.categoria) {
    const nome = categorie.find((categoria) => categoria?.slug === filtri.categoria)?.nome ?? filtri.categoria;
    attivi.push({ chiave: "categoria", etichetta: testi.filtroCategoria(nome) });
  }
  if (filtri.video) attivi.push({ chiave: "video", etichetta: testi.soloVideo });
  if (filtri.area) attivi.push({ chiave: "area", etichetta: testi.filtroArea(nomeArea(filtri.area)) });
  return attivi.map((filtro) => ({ ...filtro, nome: testi.rimuoviFiltro(filtro.etichetta) }));
}

/** Titolo, riga e azione dello stato vuoto della pagina, secondo scheda e filtri. */
export function testiVuotoPagina(sezione, valori = {}) {
  const filtri = filtriAmmessi(sezione, valori);
  const attivi = [filtri.categoria, filtri.video, filtri.area].filter(Boolean).length;
  const rimuovi = attivi === 0 ? null : attivi === 1 ? testi.rimuoviIlFiltro : testi.rimuoviIFiltri;
  const vuoti = testi.vuotiPagina[sezione] ?? testi.vuotiPagina[SEZIONE_PREDEFINITA];
  if (attivi === 0) return { titolo: vuoti.titolo, riga: vuoti.riga ?? null, rimuovi };
  if (sezione === "notizie") {
    return { titolo: vuoti.titoloFiltrato, riga: attivi === 1 ? vuoti.rigaFiltrataUno : vuoti.rigaFiltrata, rimuovi };
  }
  const titolo = filtri.area === AREA_NAZIONALE ? vuoti.titoloNazionale : vuoti.titoloArea(nomeArea(filtri.area));
  return { titolo, riga: vuoti.rigaFiltrata, rimuovi };
}

/**
 * Altezza della barra dei filtri in `--edunews24-altezza-filtri` sulla radice
 * del documento, per lo scroll-padding della pagina (styles/edunews24.css,
 * regola 8): con i filtri attivi la seconda riga puo' andare a capo. Come
 * osservaTestataElenco, un ResizeObserver e nessun listener di scroll.
 * Restituisce la pulizia, che toglie anche la proprieta'.
 */
export function osservaAltezzaFiltri(barra, radice = globalThis.document?.documentElement) {
  if (!barra || !radice || typeof ResizeObserver === "undefined") return () => {};
  const aggiorna = () => {
    radice.style.setProperty("--edunews24-altezza-filtri", `${Math.ceil(barra.getBoundingClientRect().height)}px`);
  };
  const osservatore = new ResizeObserver(aggiorna);
  osservatore.observe(barra);
  aggiorna();
  return () => {
    osservatore.disconnect();
    radice.style.removeProperty("--edunews24-altezza-filtri");
  };
}

/** Pagina EduNews24 aperta su una scheda: "/edunews24" per le notizie. */
export function percorsoPaginaEduNews24(sezione) {
  if (!SEZIONI_EDUNEWS24.includes(sezione)) throw new TypeError("Sezione EduNews24 sconosciuta");
  if (sezione === SEZIONE_PREDEFINITA) return ROTTE.edunews24;
  return `${ROTTE.edunews24}?${new URLSearchParams({ scheda: sezione })}`;
}

// --- percorsi dell'API ------------------------------------------------------

/**
 * Rotta del backend per una sezione con i suoi filtri, in ordine fisso
 * (categoria, solo_video, area): e' anche la chiave degli hook.
 */
export function percorsoSezione(sezione, valori = {}) {
  if (!Object.hasOwn(RISORSE, sezione)) throw new TypeError("Sezione EduNews24 sconosciuta");
  const filtri = filtriAmmessi(sezione, valori);
  const parametri = new URLSearchParams();
  if (filtri.categoria) parametri.set("categoria", filtri.categoria);
  if (filtri.video) parametri.set("solo_video", "si");
  if (filtri.area) parametri.set("area", filtri.area);
  const query = parametri.toString();
  return query ? `${RISORSE[sezione]}?${query}` : RISORSE[sezione];
}

/** Aggiunge il cursore solo se ha la forma di quelli emessi dal backend. */
export function conCursore(percorso, cursore) {
  if (!cursoreValido(cursore)) return percorso;
  return `${percorso}${percorso.includes("?") ? "&" : "?"}${new URLSearchParams({ cursore })}`;
}

export function percorsoCategorie() {
  return "/edunews24/categorie";
}

// --- errori ------------------------------------------------------------------

/**
 * Tipo dell'errore e secondi di attesa da Retry-After. I testi si compongono
 * secondo il contesto (modulo, primo caricamento, "Carica altri").
 */
export function erroreEduNews24(stato, retryAfter) {
  if (stato === 409) return { tipo: "cursore", attesaSecondi: 0 };
  if (stato === 400 || stato === 422) return { tipo: "richiesta", attesaSecondi: 0 };
  if ([429, 500, 502, 503, 504].includes(stato)) return { tipo: "servizio", attesaSecondi: secondiAttesa(retryAfter) };
  if (stato === 0) return { tipo: "rete", attesaSecondi: 0 };
  return { tipo: "generico", attesaSecondi: 0 };
}

/** Nota accanto a "Riprova" nel modulo. */
export function notaRiprova(secondi) {
  return secondi > 0 ? testi.riprovaTra(secondi) : testi.riprovaPresto;
}

/**
 * Errore del primo caricamento della pagina: `testo` dell'AlertMessage,
 * `azione` ("riprova" o "rimuovi-filtri") e `nota` accanto a "Riprova", come
 * nel modulo. Con Retry-After la nota dice i secondi iniziali finche'
 * `bloccato`, poi sparisce; senza, dice "qualche istante". Il testo
 * dell'avviso non cambia allo sblocco, cosi' il role="alert" non si ripete.
 */
export function messaggioErrorePagina(sezione, stato, attesaSecondi = 0, bloccato = false) {
  const { tipo } = erroreEduNews24(stato);
  if (tipo === "richiesta") return { testo: testi.filtroNonValido, azione: "rimuovi-filtri", nota: null };
  if (tipo === "cursore") return { testo: testi.cursore, azione: "riprova", nota: null };
  const nota = attesaSecondi > 0 && !bloccato ? null : notaRiprova(attesaSecondi);
  return { testo: testi.errorePagina(sezione), azione: "riprova", nota };
}

/** Errore di "Carica altri" per StatoPagineElenco, senza secondi. */
export function messaggioErroreAltre(stato) {
  return stato === 409 ? testi.cursore : testi.erroreAltre;
}

// --- voci --------------------------------------------------------------------

export function chiaveVoce(voce) {
  return `${voce.tipo}:${voce.id}`;
}

/** Accoda le voci nuove senza ripetere quelle gia' presenti (ne' doppioni fra le nuove). */
export function deduplicaVoci(esistenti, nuove) {
  const viste = new Set(esistenti.map(chiaveVoce));
  const unite = [...esistenti];
  for (const voce of nuove) {
    const chiave = chiaveVoce(voce);
    if (viste.has(chiave)) continue;
    viste.add(chiave);
    unite.push(voce);
  }
  return unite;
}

/** URL https senza credenziali, oppure null. Non solleva mai. */
export function urlHttps(valore) {
  if (typeof valore !== "string" || valore === "") return null;
  try {
    const url = new URL(valore);
    return url.protocol === "https:" && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

/** Immagine mostrabile: https e diversa dal segnaposto di EduNews24. */
export function immagineUtilizzabile(valore) {
  const url = urlHttps(valore);
  return url !== null && url.pathname !== PERCORSO_SEGNAPOSTO;
}

export function videoRiproducibile(voce) {
  return urlHttps(voce?.video?.url) !== null && TIPI_VIDEO.includes(voce.video.tipo_mime);
}

export function haVideo(voce) {
  return voce?.ha_video === true || videoRiproducibile(voce);
}

/** Copertina del player: quella del video, altrimenti l'immagine dell'articolo. Solo per VideoArticolo. */
export function copertinaVideo(voce) {
  return voce?.video?.copertina ?? voce?.immagine ?? null;
}

function leggiVideo(video) {
  if (!video || typeof video !== "object") return null;
  if (urlHttps(video.url) === null || !TIPI_VIDEO.includes(video.tipo_mime)) return null;
  return {
    url: video.url,
    tipo_mime: video.tipo_mime,
    copertina: immagineUtilizzabile(video.copertina) ? video.copertina : null,
    durata_secondi: interoPositivo(video.durata_secondi) ? video.durata_secondi : null,
  };
}

function leggiNotizia(voce) {
  const video = leggiVideo(voce.video);
  const categoria = voce.categoria && slugCategoriaValido(voce.categoria.slug) && testoPieno(voce.categoria.nome)
    ? { slug: voce.categoria.slug, nome: voce.categoria.nome }
    : null;
  return {
    ...voce,
    titolo_breve: testoPieno(voce.titolo_breve),
    sintesi: testoPieno(voce.sintesi),
    categoria,
    immagine: immagineUtilizzabile(voce.immagine) ? voce.immagine : null,
    video,
    ha_video: voce.ha_video === true || video !== null,
  };
}

function leggiRegioni(regioni) {
  return (Array.isArray(regioni) ? regioni : [])
    .filter((regione) => typeof regione?.slug === "string" && typeof regione?.nome === "string")
    .map(({ slug, nome }) => ({ slug, nome }));
}

const giornoValido = (valore) => (numeroGiorno(valore) === null ? null : valore);

function leggiOpportunita(voce) {
  const selezione = voce.tipo === "selezione-personale";
  return {
    ...voce,
    sintesi: testoPieno(voce.sintesi),
    ente: testoPieno(voce.ente),
    sede: testoPieno(voce.sede),
    regioni: leggiRegioni(voce.regioni),
    nazionale: voce.nazionale === true,
    scadenza: numeroGiorno(voce.scadenza) === null ? null : voce.scadenza,
    stato: STATI_OPPORTUNITA.includes(voce.stato) ? voce.stato : null,
    classe_concorso: voce.tipo === "interpello" ? testoPieno(voce.classe_concorso) : null,
    figura: selezione ? testoPieno(voce.figura) : null,
    posti: selezione && interoPositivo(voce.posti) ? voce.posti : null,
  };
}

/**
 * Bando con i soli campi del contratto (Bando in schemi.py): un campo non
 * valido vale null, un campo in piu' non passa. Id, url e titolo li ha gia'
 * controllati leggiVoce.
 */
function leggiBando(voce) {
  return {
    tipo: voce.tipo,
    id: voce.id,
    titolo: voce.titolo,
    titolo_breve: testoPieno(voce.titolo_breve),
    sintesi: testoPieno(voce.sintesi),
    url: voce.url,
    ente: testoPieno(voce.ente),
    regioni: leggiRegioni(voce.regioni),
    nazionale: voce.nazionale === true,
    pubblicato_il: typeof voce.pubblicato_il === "string" && istante(voce.pubblicato_il) ? voce.pubblicato_il : null,
    scadenza: giornoValido(voce.scadenza),
    stato: STATI_BANDO.includes(voce.stato) ? voce.stato : null,
    apertura: giornoValido(voce.apertura),
    pubblicato_dalla_fonte: giornoValido(voce.pubblicato_dalla_fonte),
    tipologia: testoPieno(voce.tipologia),
    programma: testoPieno(voce.programma),
    dotazione_euro: interoPositivo(voce.dotazione_euro) ? voce.dotazione_euro : null,
    importo_massimo_euro: interoPositivo(voce.importo_massimo_euro) ? voce.importo_massimo_euro : null,
    da_verificare: MOTIVI_DA_VERIFICARE.includes(voce.da_verificare) ? voce.da_verificare : null,
  };
}

function leggiVoce(voce) {
  if (!voce || typeof voce !== "object") return null;
  if (!interoPositivo(voce.id) || urlHttps(voce.url) === null || !testoPieno(voce.titolo)) return null;
  if (voce.tipo === "notizia") return leggiNotizia(voce);
  if (voce.tipo === "interpello" || voce.tipo === "selezione-personale") return leggiOpportunita(voce);
  if (voce.tipo === "bando") return leggiBando(voce);
  return null;
}

function leggiMeta(dati) {
  const meta = dati.meta && typeof dati.meta === "object" ? dati.meta : null;
  return {
    cursore: cursoreValido(meta?.cursore_successivo) ? meta.cursore_successivo : null,
    stantio: meta?.stantio === true,
    aggiornatoIl: istante(meta?.aggiornato_il) && typeof meta.aggiornato_il === "string" ? meta.aggiornato_il : null,
  };
}

/**
 * Risposta di un elenco del backend: { attiva, elementi, cursore, stantio,
 * aggiornatoIl }. Solleva TypeError su una forma non valida; le voci non
 * valide si scartano una per una.
 */
export function leggiRispostaElenco(dati) {
  if (!dati || typeof dati !== "object" || typeof dati.attiva !== "boolean") {
    throw new TypeError("Risposta di EduNews24 non valida");
  }
  if (!dati.attiva) return { attiva: false, elementi: [], cursore: null, stantio: false, aggiornatoIl: null };
  if (!Array.isArray(dati.elementi)) throw new TypeError("Risposta di EduNews24 non valida");
  const elementi = deduplicaVoci([], dati.elementi.map(leggiVoce).filter(Boolean));
  return { attiva: true, elementi, ...leggiMeta(dati) };
}

/** Risposta delle categorie: { attiva, categorie, stantio }. */
export function leggiRispostaCategorie(dati) {
  if (!dati || typeof dati !== "object" || typeof dati.attiva !== "boolean") {
    throw new TypeError("Risposta di EduNews24 non valida");
  }
  if (!dati.attiva) return { attiva: false, categorie: [], stantio: false };
  if (!Array.isArray(dati.elementi)) throw new TypeError("Risposta di EduNews24 non valida");
  const categorie = [];
  for (const categoria of dati.elementi) {
    if (!slugCategoriaValido(categoria?.slug) || !testoPieno(categoria?.nome)) continue;
    if (categorie.some((presente) => presente.slug === categoria.slug)) continue;
    categorie.push({ slug: categoria.slug, nome: categoria.nome });
  }
  return { attiva: true, categorie, stantio: leggiMeta(dati).stantio };
}

// --- durata e nomi accessibili ---------------------------------------------

/** "1:05" oppure "1:00:05"; null se la durata non e' valida. */
export function formattaDurata(secondi) {
  if (!interoPositivo(secondi)) return null;
  const ore = Math.floor(secondi / 3600);
  const minuti = Math.floor((secondi % 3600) / 60);
  const resto = secondi % 60;
  return ore ? `${ore}:${due(minuti)}:${due(resto)}` : `${minuti}:${due(resto)}`;
}

/** "durata 1 minuto e 5 secondi"; null se la durata non e' valida. */
export function descriviDurata(secondi) {
  if (!interoPositivo(secondi)) return null;
  return testi.durataEstesa(Math.floor(secondi / 60), secondi % 60);
}

/**
 * Titolo di una notizia nel modulo (apertura e miniature): il testo visibile e'
 * il titolo breve (`titolo_breve`, title_summary di EduNews24) o, senza, il
 * titolo, mai nascosto ai lettori di schermo. Per loro segue ": {titolo
 * completo}" solo se diverso e, con `conVideo`, il video e la durata: il
 * testo visibile resta all'inizio del nome accessibile (Label in Name). La
 * pagina usa sempre il titolo completo.
 */
export function titoloModulo(voce, { conVideo = false } = {}) {
  const visibile = testoPieno(voce.titolo_breve) ?? voce.titolo;
  let aggiunta = visibile.trim() === voce.titolo.trim() ? "" : `: ${voce.titolo}`;
  if (conVideo && haVideo(voce)) {
    const durata = descriviDurata(voce.video?.durata_secondi);
    aggiunta += `, ${testi.video}${durata ? `, ${durata}` : ""}`;
  }
  return { visibile, aggiunta, nome: `${visibile}${aggiunta}` };
}

/** Nome della copertina del video: "Guarda il video: {titolo}, durata ...". */
export function nomeGuardaVideo(voce) {
  const durata = descriviDurata(voce.video?.durata_secondi);
  const aggiunta = `: ${voce.titolo}${durata ? `, ${durata}` : ""}`;
  return { visibile: testi.guardaVideo, aggiunta, nome: `${testi.guardaVideo}${aggiunta}` };
}

// --- modulo e pagina -------------------------------------------------------

/**
 * Voci del modulo dalla prima pagina condivisa: tutte le notizie; i primi
 * interpelli; per la selezione solo quelle aperte e non scadute; per i bandi
 * solo quelli aperti o in apertura e non scaduti, uno in meno.
 */
export function vociModulo(sezione, elementi, adesso) {
  const voci = deduplicaVoci([], Array.isArray(elementi) ? elementi : []);
  if (sezione === "notizie") return voci;
  if (sezione === "interpelli") return voci.slice(0, VOCI_OPPORTUNITA_MODULO);
  if (sezione === "selezione-personale") {
    return voci.filter((voce) => !voceChiusaOScaduta(voce, adesso)).slice(0, VOCI_OPPORTUNITA_MODULO);
  }
  if (sezione === "bandi") {
    return voci.filter((voce) => {
      const giorni = giorniAllaScadenza(voce?.scadenza, adesso);
      return (voce?.stato === "aperto" || voce?.stato === "in-apertura") && (giorni === null || giorni >= 0);
    }).slice(0, VOCI_BANDI_MODULO);
  }
  return [];
}

/**
 * Link a BandoFit con i soli UTM fissi e la posizione (un valore di
 * POSIZIONI_BANDOFIT) in utm_content. Una posizione sconosciuta solleva.
 */
export function urlBandoFit(posizione) {
  if (!Object.values(POSIZIONI_BANDOFIT).includes(posizione)) throw new TypeError("Posizione di BandoFit sconosciuta");
  const url = new URL(URL_BANDOFIT);
  for (const [nome, valore] of Object.entries({ ...UTM_BANDOFIT, utm_content: posizione })) url.searchParams.set(nome, valore);
  return url.href;
}

/** Voce scelta nella fascia; senza scelta valida, la prima. */
export function voceInEvidenza(voci, chiave) {
  return voci.find((voce) => chiaveVoce(voce) === chiave) ?? voci[0] ?? null;
}

/**
 * Annuncio nascosto dell'esito di "Riprova" nel modulo, quando arriva: il
 * contenuto compare in silenzio, il vuoto non ha una regione live e l'errore
 * nasce gia' pieno. Vuoto finche' lo stato non e' un esito (scheletro).
 */
export function annuncioEsitoModulo(stato, sezione) {
  if (stato === "pronto") return testi.annunci.aggiornato;
  if (stato === "vuoto") return (testi.vuotiModulo[sezione] ?? testi.vuotiModulo.notizie).titolo;
  if (stato === "errore") return testi.erroreModulo;
  return "";
}

/**
 * Impaginazione delle notizie della pagina. Apertura e secondarie vengono
 * dalla prima pagina non vuota; il resto si divide in bande che non
 * attraversano mai il confine di una pagina, cosi' "Carica altri" non
 * ricompone le righe gia' viste. La fase del ciclo prosegue fra le pagine
 * dalla banda successiva all'ultima completata; l'ultima banda incompleta di
 * una pagina diventa "coda" (1 o 2 voci).
 *
 * Coppia (7|5) e specchio (5|7) dicono in `colonnaB` le voci della colonna
 * piccola: la voce B sola, oppure, se B non ha un'immagine utilizzabile, B e
 * la voce dopo, due voci di testo una sotto l'altra; la banda ne prende
 * allora 3. Se la pagina non ne ha una terza, la colonna resta con B sola.
 * Nella coppia la voce grande e' la prima, nello specchio l'ultima.
 */
export function bandeGriglia(lunghezzePagine, voci) {
  const pagine = [];
  let inizio = 0;
  for (const lunghezza of lunghezzePagine) {
    const quante = Number.isInteger(lunghezza) && lunghezza > 0 ? lunghezza : 0;
    pagine.push(voci.slice(inizio, inizio + quante));
    inizio += quante;
  }
  if (inizio < voci.length) pagine.push(voci.slice(inizio));
  const piene = pagine.filter((pagina) => pagina.length > 0);
  const [prima = [], ...altre] = piene;
  const apertura = prima[0] ?? null;
  const secondarie = prima.slice(1, 1 + SECONDARIE_PRIMA_PAGINA);
  const bande = [];
  let fase = 0;
  for (const resto of [prima.slice(1 + SECONDARIE_PRIMA_PAGINA), ...altre]) {
    let posizione = 0;
    while (posizione < resto.length) {
      const { schema, voci: quante, piccola } = CICLO_BANDE[fase];
      const disponibili = resto.length - posizione;
      if (disponibili < quante) {
        bande.push({ schema: "coda", voci: resto.slice(posizione) });
        break;
      }
      if (piccola === undefined) {
        bande.push({ schema, voci: resto.slice(posizione, posizione + quante) });
        posizione += quante;
      } else {
        const doppia = disponibili > quante && !immagineUtilizzabile(resto[posizione + piccola].immagine);
        const prese = quante + (doppia ? 1 : 0);
        const banda = resto.slice(posizione, posizione + prese);
        bande.push({ schema, voci: banda, colonnaB: banda.slice(piccola, piccola + (doppia ? 2 : 1)) });
        posizione += prese;
      }
      fase = (fase + 1) % CICLO_BANDE.length;
    }
  }
  return { apertura, secondarie, bande: bande.map((banda) => ({ ...banda, chiave: chiaveVoce(banda.voci[0]) })) };
}

/**
 * Gruppi per giorno di pubblicazione (Roma), nell'ordine di prima comparsa;
 * le voci senza data in fondo. Per "Oggi" e "Ieri" `dataEstesa` e' la data
 * da mostrare accanto ("28 settembre").
 */
export function raggruppaPerGiorno(voci, adesso) {
  const oggi = giornoRoma(adesso);
  const gruppi = new Map();
  for (const voce of voci) {
    const giorno = giornoRoma(voce?.pubblicato_il);
    if (!gruppi.has(giorno)) gruppi.set(giorno, []);
    gruppi.get(giorno).push(voce);
  }
  const ordinati = [...gruppi.entries()].filter(([giorno]) => giorno !== null);
  if (gruppi.has(null)) ordinati.push([null, gruppi.get(null)]);
  return ordinati.map(([giorno, elenco]) => {
    const etichetta = etichettaGiorno(giorno, oggi);
    const relativa = etichetta === testi.oggi || etichetta === testi.ieri;
    const parti = relativa ? partiGiorno(giorno) : null;
    const dataEstesa = parti ? (giorno.slice(0, 4) === oggi.slice(0, 4) ? parti.estesoSenzaAnno : parti.esteso) : null;
    return { giorno, etichetta, dataEstesa, voci: elenco };
  });
}

/**
 * Forma di una voce della pagina, decisa dal dato. Nei posti piccoli (forma
 * "compatta": secondari, B della coppia, terzina, voce piccola dello
 * specchio, coda con due voci) una notizia senza immagine utilizzabile e' di
 * solo testo, senza riquadro ne' ripiego. Le voci grandi ("scheda" e
 * "fascia") tengono il ripiego blu. Un'immagine che poi non si carica resta
 * nel suo riquadro con il ripiego: la forma non cambia dopo l'impaginazione.
 */
export function formaVocePagina(forma, voce) {
  return forma === "compatta" && !immagineUtilizzabile(voce?.immagine) ? "testo" : forma;
}

/** Variante del ripiego tipografico (0, 1 o 2), stabile per voce. */
export function varianteRipiego(id) {
  return Number.isSafeInteger(id) && id >= 0 ? id % 3 : 0;
}

// Coppia del logo (pieno e bordato) nelle unita' dell'SVG di EduNews24,
// ingrandita e tagliata dal bordo destro del riquadro 160 x 90 del ripiego.
const COPPIA_LOGO = { pieno: { l: 86, h: 38 }, bordato: { dx: 80, dy: 4, l: 124, h: 28 } };
const POSIZIONI_RIPIEGO = [
  { x: 62, y: 8, scala: 0.9 }, // a destra
  { x: 70, y: 46, scala: 0.75 }, // in basso
  { x: 40, y: -10, scala: 1.2 }, // spostata
];

function parallelogramma(x, y, larghezza, altezza, pendenza) {
  const scarto = pendenza * altezza;
  const punti = [[x + scarto, y], [x + larghezza + scarto, y], [x + larghezza, y + altezza], [x, y + altezza]];
  return punti.map((punto) => punto.map((valore) => Number(valore.toFixed(2))).join(",")).join(" ");
}

/**
 * Tracciati SVG (viewBox 0 0 160 90) del motivo del ripiego: `points` del
 * parallelogramma pieno e di quello bordato, con le pendenze del logo.
 */
export function motivoRipiego(variante) {
  const { x, y, scala } = POSIZIONI_RIPIEGO[Number.isInteger(variante) && variante >= 0 ? variante % 3 : 0];
  const { pieno, bordato } = COPPIA_LOGO;
  return {
    pieno: parallelogramma(x, y, pieno.l * scala, pieno.h * scala, PENDENZA_PIENO),
    bordato: parallelogramma(x + bordato.dx * scala, y + bordato.dy * scala, bordato.l * scala, bordato.h * scala, PENDENZA_BORDATO),
  };
}
