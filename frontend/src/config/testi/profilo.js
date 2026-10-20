export const TESTI_PROFILO = {
  titolo: "Il mio profilo",
  caricamento: "Caricamento del profilo…",
  errore: "Non è stato possibile caricare il tuo profilo. Riprova.",
  riprova: "Riprova",
  nonIndicato: "Non indicato",
  account: "Il tuo account",
  dettagliUtente: "Dettagli utente e ruolo",
  username: "Nome utente",
  ruolo: "Ruolo",
  azienda: "Centro",
};

export const SEZIONI_PROFILO = [
  { id: "anagrafica", titolo: "Informazioni personali", campi: [
    ["nome", "Nome"], ["cognome", "Cognome"],
    ["codice_fiscale", "Codice fiscale"], ["cittadinanza", "Cittadinanza"],
  ] },
  { id: "contatti", titolo: "Contatti", campi: [
    ["email", "Email"], ["pec", "PEC"], ["telefono", "Telefono"], ["cellulare", "Cellulare"],
  ] },
  { id: "residenza", titolo: "Residenza", campo: "residenza" },
  { id: "domicilio", titolo: "Domicilio", campo: "domicilio" },
];

export const SCHEDE_PROFILO = [
  { id: "dati-principali", etichetta: "Dati principali" },
  { id: "utente", etichetta: "Utente" },
  // Secondo fattore: solo il Nazionale la vede (ADR 0009).
  { id: "sicurezza", etichetta: "Sicurezza", soloNazionale: true },
];

export const CAMPI_INDIRIZZO = [
  ["indirizzo", "Indirizzo"], ["civico", "Numero civico"], ["citta", "Comune"],
  ["cap", "CAP"], ["provincia", "Provincia"],
];
