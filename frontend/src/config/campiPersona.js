const testo = (nome, etichetta, colonne = 3, extra = {}) => ({ nome, etichetta, colonne, ...extra });
const obbligatorio = { required: true };
const data = { type: "date", required: true };
const provincia = { maxLength: 2 };
const indirizzo = (domicilio = false) => {
  const fine = domicilio ? "Domicilio" : "";
  const richiesto = domicilio ? {} : obbligatorio;
  return [testo(`cliente_indirizzo${fine}`, "Indirizzo", 5, richiesto),
    testo(`cliente_civico${fine}`, "Civico", 1, { maxLength: 45 }),
    testo(`cliente_CAP${fine}`, "CAP", 2, { ...richiesto, maxLength: 5, inputMode: "numeric" }),
    testo(`cliente_citta${fine}`, "Comune", 3, richiesto),
    testo(`cliente_provincia${fine}`, "Provincia", 1, { ...richiesto, ...provincia })];
};

export const SEZIONI_PERSONA = [
  { id: "personali", titolo: "Informazioni personali", campi: [
    testo("cliente_nome", "Nome", 3, obbligatorio), testo("cliente_cognome", "Cognome", 3, obbligatorio),
    testo("cliente_codice_fiscale", "Codice fiscale", 4, { ...obbligatorio, maxLength: 16 }),
    testo("cliente_sesso", "Genere", 2, { opzioni: [["uomo", "Uomo"], ["donna", "Donna"]] }),
    testo("cliente_dataNascita", "Data di nascita", 2, data), testo("cliente_luogoNascita", "Luogo di nascita", 3, obbligatorio),
    testo("cliente_provinciaNascita", "Provincia", 1, provincia), testo("cliente_cittadinanza", "Cittadinanza", 3, obbligatorio),
  ] },
  { id: "documento", titolo: "Documento", campi: [
    testo("cliente_tipoDocumento", "Tipo documento", 3, { opzioni: ["Carta d'identità", "Passaporto", "Patente", "Altro"].map(v => [v, v]) }),
    testo("cliente_documento", "Numero documento", 3, { ...obbligatorio, maxLength: 45 }),
    testo("cliente_comuneRilascio", "Comune di rilascio", 2, obbligatorio),
    testo("cliente_dataRilascio", "Data rilascio", 2, data), testo("cliente_dataScadenzaDocumento", "Data scadenza", 2, data),
  ] },
  { id: "residenza", titolo: "Residenza", campi: indirizzo() },
  { id: "domicilio", titolo: "Domicilio", campi: indirizzo(true) },
  { id: "contatti", titolo: "Contatti", campi: [
    testo("cliente_email", "Email", 3, { type: "email", required: true }),
    testo("cliente_cellulare", "Cellulare", 3, { type: "tel", required: true, maxLength: 45 }),
    testo("cliente_telefono", "Telefono", 3, { type: "tel" }), testo("cliente_pec", "PEC", 3, { type: "email" }),
  ] },
];
export const CAMPI_PERSONA = SEZIONI_PERSONA.flatMap(s => s.campi);
export const VUOTA_PERSONA = Object.fromEntries(CAMPI_PERSONA.map(c => [c.nome, ""]));
export const CAMPI_RELAZIONI_PERSONA = ["cliente_ruolo", "azienda_id", "attuatore_id", "padre_utente_id"];
