// Scheda di sottoscrittori e attuatori (components/anagrafiche/). Le opzioni
// dei select sono coppie [valore, etichetta]: il valore e' quello salvato nel
// database e non cambia.

const NOMI = { sottoscrittore: "sottoscrittore", attuatore: "attuatore" };
const nome = (tipo) => NOMI[tipo] ?? NOMI.sottoscrittore;

export const TESTI_ANAGRAFICA = {
  /** "Modifica sottoscrittore", "Modifica attuatore". */
  titolo: (tipo) => `Modifica ${nome(tipo)}`,
  ritorno: (tipo) => (tipo === "attuatore" ? "Attuatori" : "Sottoscrittori"),
  // Attuatore aperto dalla scheda di un centro.
  ritornoCentro: "Centro",
  caricamento: "Caricamento dell’anagrafica…",
  erroreLettura: "Impossibile caricare l’anagrafica.",
  // Schede: le chiavi sono gli id della query ?scheda=.
  etichettaSchede: "Schede anagrafica",
  schede: {
    "dati-principali": "Anagrafica",
    centro: "Centro",
    utente: "Utente",
  },
  // Barra delle azioni in fondo alla scheda.
  annulla: "Annulla",
  salva: "Salva modifiche",
  salvataggio: "Salvataggio…",
  salvataggioRiuscito: "Modifiche salvate.",
  // Il salvataggio ha cambiato il tipo: `tipo` e' quello nuovo.
  cambioTipo: (tipo) =>
    `Modifiche salvate. L’anagrafica ora è tra ${tipo === "attuatore" ? "gli attuatori" : "i sottoscrittori"}.`,
  nessunaModifica: "Nessuna modifica da salvare.",
  erroreSalvataggio: "Impossibile salvare l’anagrafica. Riprova.",
  // Sezione Ruolo, solo per gli attuatori: stessa scelta della scheda Utente.
  ruolo: {
    titolo: "Ruolo",
    descrizione: "Livello dell'attuatore nella rete.",
    etichetta: "Ruolo attuatore",
  },
};

export const SEGNAPOSTI_ANAGRAFICA = {
  genere: "Seleziona il genere",
  documento: "Seleziona il tipo di documento",
};

export const TESTI_INFORMAZIONI = {
  titolo: "Informazioni personali",
  descrizione: (tipo) =>
    `Dati anagrafici ${tipo === "attuatore" ? "dell'attuatore" : "del sottoscrittore"}.`,
  nome: "Nome",
  cognome: "Cognome",
  codiceFiscale: "Codice fiscale",
  genere: "Genere",
  generi: [
    ["uomo", "Uomo"],
    ["donna", "Donna"],
  ],
  dataDiNascita: "Data di nascita",
  luogoDiNascita: "Luogo di nascita",
  provDiNascita: "Prov.",
  cittadinanza: "Cittadinanza",
};

// Email e cellulare, con la loro verifica, vengono dalla sezione account
// (components/account/, testi in account.js).
export const TESTI_CONTATTI = {
  titolo: "Contatti",
  altriRecapiti: "Altri recapiti",
  pec: "PEC",
  telefono: "Telefono",
};

export const TESTI_DOCUMENTO = {
  titolo: "Documento",
  descrizione: "Documento di riconoscimento in corso di validità.",
  tipoDocumento: "Tipo documento",
  tipi: [
    ["Carta d'identità", "Carta d'identità"],
    ["Passaporto", "Passaporto"],
    ["Patente", "Patente"],
  ],
  nDocumento: "N° documento",
  comuneDiRilascio: "Comune di rilascio",
  dataRilascio: "Data rilascio",
  dataScadenza: "Data scadenza",
};

export const TESTI_RESIDENZA = {
  residenza: "Residenza",
  domicilio: "Domicilio",
  descrizioneDomicilio: "Solo se diverso dalla residenza.",
  copia: "Copia da residenza",
  copiata: "Residenza copiata in Domicilio",
  // Etichette per suffisso del nome del campo (residenzaIndirizzo, ...).
  campi: {
    Indirizzo: "Indirizzo",
    Civico: "Civico",
    Comune: "Comune",
    Cap: "CAP",
    Provincia: "Prov.",
  },
};

// Scheda Centro dell'attuatore: il centro associato e, per chi puo', la
// ricerca per partita IVA, il cambio e la rimozione, con effetto subito.
export const TESTI_CENTRO = {
  campi: {
    ragione_sociale: "Ragione sociale",
    partita_iva: "Partita IVA",
    codice_fiscale: "Codice fiscale",
    email: "Email",
    pec: "PEC",
    telefono: "Telefono",
    sede: "Sede",
  },
  sede: (citta, provincia) => [citta, provincia && `(${provincia})`].filter(Boolean).join(" "),
  vuoto: "Nessun centro associato a questo attuatore.",
  nascosto: "Questo attuatore è associato a un centro che non puoi vedere.",
  attuale: (nome) => `Centro attuale: ${nome}`,
  trattino: "—",
  etichettaRicerca: "Partita IVA del centro",
  segnapostoRicerca: "11 cifre",
  pivaIncompleta: "Inserisci 11 cifre.",
  cerca: "Cerca centro",
  ricercaInCorso: "Ricerca in corso…",
  annulla: "Annulla",
  cambia: "Cambia centro",
  rimuovi: "Rimuovi associazione",
  confermaRimozione: "Rimuovere il centro associato a questo attuatore?",
  associato: "Centro associato.",
  rimosso: "Associazione rimossa.",
  erroreRicerca: "Impossibile cercare il centro. Riprova.",
  erroreAssociazione: "Impossibile cambiare il centro. Riprova.",
};

export const TESTI_UTENTE = {
  account: {
    titolo: "Account e ruolo",
    descrizione: "Credenziali di accesso e gerarchia.",
  },
  username: "Username",
  ruolo: "Ruolo",
  senzaRuolo: "Nessuno (senza accesso)",
  padre: "Utente padre",
  cambiaPadre: "Cambia padre",
  nessuno: "Nessuno",
  accedi: "Accedi con questo utente",
  accesso: "Accesso in corso…",
  cronologia: "Cronologia",
  creato: "Creato il",
  aggiornato: "Ultimo aggiornamento",
  aggiornatoDa: "Aggiornato da",
  vuoto: "-",
  erroreAccesso: "Impossibile accedere con questo utente. Riprova.",
};

// Finestra "Cambia padre" della scheda Utente: gli attuatori fra cui scegliere.
export const TESTI_PADRE = {
  titolo: "Seleziona nuovo utente padre",
  chiudi: "Chiudi la selezione dell'utente padre",
  cerca: "Cerca per nome, cognome o centro…",
  etichettaCerca: "Cerca un attuatore",
  etichettaRuolo: "Filtra per ruolo",
  tuttiIRuoli: "Tutti i ruoli",
  etichettaTabella: "Attuatori fra cui scegliere l'utente padre",
  colonne: {
    attuatore: "Attuatore", nome: "Nome", cognome: "Cognome", ruolo: "Ruolo", centro: "Centro", azione: "Azione",
  },
  /** Seconda riga della colonna Attuatore, nelle finestre strette. */
  dettaglio: (ruolo, centro) => [ruolo, centro].filter(Boolean).join(" · "),
  seleziona: "Seleziona",
  /** Nome dell'attuatore per i lettori di schermo: "Seleziona Mario Rossi". */
  selezionaNome: (nome) => `Seleziona ${nome}`,
  nessuno: "Nessun attuatore trovato.",
  caricamento: "Aggiornamento in corso…",
  erroreLettura: "Impossibile caricare gli attuatori.",
  vuoto: "—",
};
