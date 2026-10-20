// Testi delle notizie del Nazionale: elenco, scheda, modulo e riquadro della Dashboard.
// Sezioni e argomenti sono le tabelle tag e tag_dettaglio del database:
// il codice tiene i nomi delle tabelle.
import { RUOLI } from "../ruoli.js";

/** L'unico ruolo che scrive le notizie; gli altri le leggono. */
export const RUOLO_SCRIVE_NOTIZIE = "nazionale";

/** I gruppi dei destinatari, nell'ordine del catalogo e dell'API: i ruoli
 * che vedono le Notizie, tranne il Nazionale, che le vede comunque tutte
 * (backend/src/notizie/dati.py, GRUPPI). */
export const GRUPPI_NOTIZIA = RUOLI
  .filter((r) => r.codice !== RUOLO_SCRIVE_NOTIZIE && r.menu.includes("notizie"))
  .map((r) => ({ valore: r.codice, etichetta: r.nome }));

export const TESTI_NOTIZIE = {
  titolo: "Notizie",
  descrizione: "Le notizie e gli avvisi del Nazionale.",
  nuova: "Nuova",
  nuovaEstesa: "Nuova notizia",
  vuoto: "Non ci sono notizie.",
  vuotoFiltri: "Nessuna notizia con questi filtri.",
  tag: "Sezioni",
  tagEstesa: "Gestisci sezioni e argomenti",
  // Pannello Filtri: tutte, una sezione o uno o piu' suoi argomenti.
  sceltaFiltro: "Sezioni e argomenti",
  tutteLeNotizie: "Tutte le notizie",
};

// "1 notizia" / "N notizie".
const notizie = (n) => (n === 1 ? "1 notizia" : `${n} notizie`);

// Notizie non ancora aperte: pallino sulla notizia (elenco e Dashboard) e
// numero sulla voce del menu.
export const TESTI_NOTIZIE_DA_LEGGERE = {
  // Letto dagli screen reader prima del titolo della notizia.
  daLeggere: "Da leggere: ",
  // Nome accessibile della voce del menu; senza notizie da leggere resta quello di sempre.
  voceMenu: (etichetta, n) => (n > 0 ? `${etichetta}, ${notizie(n)} da leggere` : etichetta),
  // Numero sulla voce del menu: fino a 99, poi "99+".
  contatore: (n) => (n > 99 ? "99+" : String(n)),
};

export const TESTI_GESTIONE_TAG = {
  titolo: "Sezioni e argomenti",
  descrizione: "Le sezioni delle notizie e i loro argomenti. Quello che è disattivato non si sceglie più, ma resta sulle notizie che lo hanno.",
  nuovoTag: "Nuova sezione",
  nuovoSottotag: (sezione) => `Nuovo argomento in ${sezione}`,
  aggiungi: "Aggiungi",
  disattiva: "Disattiva",
  riattiva: "Riattiva",
  disattivaNome: (nome) => `Disattiva ${nome}`,
  riattivaNome: (nome) => `Riattiva ${nome}`,
  // La sezione e' femminile, l'argomento maschile.
  disattivata: "Disattivata",
  disattivato: "Disattivato",
  nessunSottotag: "Nessun argomento.",
  chiudi: "Chiudi",
  caricamento: "Caricamento…",
  nomeVuoto: "Scrivi il nome.",
  erroreLettura: "Impossibile leggere sezioni e argomenti. Riprova.",
  erroreSalvataggio: "Impossibile salvare la modifica. Riprova.",
};

export const TESTI_SCHEDA_NOTIZIA = {
  indietro: "Notizie",
  modifica: "Modifica",
  elimina: "Elimina",
  apriLink: "Apri il collegamento",
  allegati: "Allegati",
  scarica: (nome) => `Scarica ${nome}`,
  destinatari: (gruppi, numero) => `Destinatari: ${gruppi} (${numero === 1 ? "1 persona" : `${numero} persone`})`,
  tuttiAttuatori: "Tutti gli attuatori",
  pubblicata: (data) => `Pubblicata il ${data}`,
  aggiornata: (data) => `Aggiornata il ${data}`,
  erroreLettura: "Impossibile leggere la notizia. Riprova.",
  erroreEliminazione: "Impossibile eliminare la notizia. Riprova.",
  erroreScarica: "Impossibile scaricare il file. Riprova.",
  confermaEliminazione: {
    titolo: "Eliminare la notizia?",
    messaggio: (titolo) => `«${titolo}» sparirà dalle notizie di tutti i destinatari.`,
    conferma: "Elimina",
  },
};

export const TESTI_MODULO_NOTIZIA = {
  titoloNuova: "Nuova notizia",
  titoloModifica: "Modifica notizia",
  indietroNuova: "Notizie",
  pubblica: "Pubblica",
  salva: "Salva",
  annulla: "Annulla",
  salvataggio: "Salvataggio…",
  erroreLettura: "Impossibile preparare il modulo. Riprova.",
  erroreSalvataggio: "Impossibile salvare la notizia. Riprova.",
  contenuto: {
    titolo: "Contenuto",
    descrizione: "Titolo e testo sono obbligatori; gli a capo del testo restano.",
    titoloNotizia: "Titolo",
    sottotitolo: "Sottotitolo",
    riassunto: "Riassunto",
    notaRiassunto: "Compare nell'elenco delle notizie, sotto il titolo.",
    testo: "Testo",
    link: "Link",
    notaLink: "Facoltativo: un indirizzo completo, che comincia con https://",
    categoria: "Sezione",
    sottotag: "Argomenti",
    notaSottotag: "Facoltativi: uno o più, della sezione scelta.",
    nessunSottotag: "Nessuno",
    senzaSottotag: "Questa sezione non ha argomenti.",
    senzaSezioni: "Non ci sono sezioni: aggiungine una da «Sezioni» nella pagina Notizie.",
  },
  immagine: {
    titolo: "Immagine",
    descrizione: "Facoltativa: JPG, PNG, GIF o WebP, fino a 10 MB.",
    scegli: "Scegli immagine",
    sostituisci: "Sostituisci immagine",
    togli: "Togli immagine",
    anteprima: "Anteprima dell'immagine",
  },
  allegati: {
    titolo: "Allegati",
    descrizione: "Facoltativi, fino a 10 MB ciascuno.",
    aggiungi: "Aggiungi allegati",
    togli: (nome) => `Togli ${nome}`,
    nessuno: "Nessun allegato.",
    daCaricare: "da caricare",
  },
  destinatari: {
    titolo: "Destinatari",
    descrizione: "Ricevono la notizia gli utenti attivi dei gruppi spuntati. I Nazionali vedono comunque tutte le notizie.",
    etichetta: "Gruppi",
    tutti: "Tutti i gruppi",
    nessuno: "Nessun gruppo",
  },
  problemi: {
    titolo: "Scrivi il titolo.",
    testo: "Scrivi il testo della notizia.",
    link: "Il link deve essere un indirizzo completo, che comincia con https://",
    categoria: "Scegli la sezione.",
    gruppi: "Scegli almeno un gruppo di destinatari.",
    immagine: "L'immagine deve essere un file JPG, PNG, GIF o WebP.",
    vuoto: (nome) => `Il file ${nome} è vuoto.`,
    troppoGrande: (nome) => `Il file ${nome} supera i 10 MB.`,
  },
  // Dopo il salvataggio: la notizia c'e', ma un file non e' andato.
  fileNonSalvati: "La notizia è salvata, ma alcuni file non sono stati caricati o tolti:",
  fileImmagine: "l'immagine",
};

export const TESTI_MODULO_NOTIZIE_DASHBOARD = {
  titolo: "Notizie dal Nazionale",
  tutte: "Tutte le notizie",
};
