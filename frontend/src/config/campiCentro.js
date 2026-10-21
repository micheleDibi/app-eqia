const campo = (nome, etichetta, colonne = 3, extra = {}) => ({ nome, etichetta, colonne, ...extra });
const obbligatorio = { required: true };
export const SEZIONI_CENTRO = [
  { id: "identita", titolo: "Dati anagrafici", campi: [
    campo("azienda_ragione_sociale", "Ragione sociale", 6, obbligatorio),
    campo("azienda_partitaIVA", "Partita IVA", 3, { ...obbligatorio, maxLength: 11, pattern: "[0-9]{11}", inputMode: "numeric" }),
    campo("azienda_codiceFiscale", "Codice fiscale", 3, { ...obbligatorio, maxLength: 16 }),
    campo("azienda_fatturazioneSDI", "Codice SDI", 3),
  ] },
  { id: "sede", titolo: "Sede", campi: [
    campo("azienda_via", "Indirizzo", 5, obbligatorio), campo("azienda_civico", "Civico", 1),
    campo("azienda_CAP", "CAP", 2, { ...obbligatorio, maxLength: 5, pattern: "[0-9]{5}", inputMode: "numeric" }),
    campo("azienda_citta", "Comune", 3, obbligatorio), campo("azienda_provincia", "Provincia", 1, { ...obbligatorio, maxLength: 2 }),
  ] },
  { id: "contatti", titolo: "Contatti", campi: [
    campo("azienda_email", "Email", 3, { type: "email" }), campo("azienda_pec", "PEC", 3, { type: "email" }),
    campo("azienda_telefono", "Telefono", 3, { type: "tel", maxLength: 45 }), campo("azienda_sitoWeb", "Sito web", 3),
  ] },
  { id: "bancari", titolo: "Coordinate bancarie", campi: [
    campo("azienda_iban", "IBAN", 4), campo("azienda_codice_bic", "BIC", 2),
  ] },
];
export const CAMPI_CENTRO = SEZIONI_CENTRO.flatMap(s => s.campi);
export const VUOTO_CENTRO = Object.fromEntries(CAMPI_CENTRO.map(c => [c.nome, ""]));
