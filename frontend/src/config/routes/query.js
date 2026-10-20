import { AREE_EDUNEWS24, SEZIONI_EDUNEWS24, SEZIONE_PREDEFINITA, slugCategoriaValido } from "../edunews24.js";
const scelta = (valori, predefinito = "") => ({ predefinito, leggi: ([valore]) => valori.includes(valore) ? valore : predefinito });
export const QUERY_EDUNEWS24 = {
  scheda: scelta(SEZIONI_EDUNEWS24, SEZIONE_PREDEFINITA),
  area: scelta(AREE_EDUNEWS24),
  categoria: { predefinito: "", leggi: ([valore]) => (slugCategoriaValido(valore) ? valore : "") },
  video: scelta(["1"]),
};

export const QUERY_PROFILO = {
  scheda: scelta(["dati-principali", "utente", "sicurezza"], "dati-principali"),
};
