// Campi della scheda di un centro. Stanno fuori da CampiAzienda.jsx perche' un
// file di componente deve esportare solo componenti, o il fast refresh di Vite
// ricarica l'intera pagina. Qui c'e' solo la struttura: etichette e segnaposti
// stanno in config/testi/azienda.js.
export const OBBLIGATORI = [
  "azienda_ragione_sociale",
  "azienda_partitaIVA",
  "azienda_codiceFiscale",
  "azienda_via",
  "azienda_citta",
  "azienda_CAP",
  "azienda_provincia",
];

/**
 * Attributi dei campi che non sono semplice testo libero:
 * - input: attributi nativi dell'<input> (la partita IVA al massimo 11
 *   cifre, la provincia la sigla di 2 lettere). Niente `pattern`: una
 *   partita IVA storica non conforme non deve bloccare il salvataggio del
 *   resto, la controlla il server quando cambia;
 * - solaLettura: il valore lo genera il server (codice nazionale);
 * - monospazio: codici da leggere carattere per carattere.
 */
export const PROPRIETA_CAMPI = {
  azienda_partitaIVA: { input: { maxLength: 11, inputMode: "numeric" } },
  azienda_provincia: { input: { maxLength: 2 } },
  azienda_codice_nazionale: { solaLettura: true, monospazio: true },
  azienda_iban: { monospazio: true },
  azienda_codice_bic: { monospazio: true },
};

// Sezioni della scheda: [campo, colonne occupate su 6]. Titolo e descrizione
// in TESTI_AZIENDA.sezioni[chiave].
export const SEZIONI_AZIENDA = [
  {
    chiave: "anagrafici",
    campi: [
      ["azienda_ragione_sociale", 6],
      ["azienda_partitaIVA", 3],
      ["azienda_codiceFiscale", 3],
      ["azienda_fatturazioneSDI", 3],
      ["azienda_codice_nazionale", 3],
    ],
  },
  {
    chiave: "sede",
    campi: [
      ["azienda_via", 5],
      ["azienda_civico", 1],
      ["azienda_CAP", 2],
      ["azienda_citta", 3],
      ["azienda_provincia", 1],
    ],
  },
  {
    chiave: "contatti",
    campi: [
      ["azienda_email", 3],
      ["azienda_pec", 3],
      ["azienda_telefono", 3],
      ["azienda_sitoWeb", 3],
    ],
  },
  {
    chiave: "bancari",
    campi: [
      ["azienda_iban", 4],
      ["azienda_codice_bic", 2],
    ],
  },
];

/** Tutti i campi della scheda, nell'ordine delle sezioni. */
export const CAMPI_AZIENDA = SEZIONI_AZIENDA.flatMap(({ campi }) => campi.map(([nome]) => nome));

// Campi della sezione "Dati anagrafici" che cambia solo il Nazionale (il
// codice nazionale non lo cambia nessuno). Gli stessi di CAMPI_ANAGRAFICI in
// backend/src/aziende/scheda.py.
export const CAMPI_ANAGRAFICI = [
  "azienda_ragione_sociale",
  "azienda_partitaIVA",
  "azienda_codiceFiscale",
  "azienda_fatturazioneSDI",
];
