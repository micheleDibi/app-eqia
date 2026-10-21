import { AREE_EDUNEWS24, SEZIONI_EDUNEWS24, SEZIONE_PREDEFINITA, slugCategoriaValido } from "../edunews24.js";
import { idValido } from "./percorsi.js";
const scelta = (valori, predefinito = "") => ({ predefinito, leggi: ([valore]) => valori.includes(valore) ? valore : predefinito });
const id = { predefinito: "", leggi: ([valore]) => (idValido(valore) ? valore : "") };
export const QUERY_GESTIONE = {
  ricerca: { predefinito: "", leggi: ([valore]) => (valore ?? "").slice(0, 200) },
  ruolo: id, centro: id,
};
export const QUERY_ANAGRAFICA = { scheda: scelta(["dati", "account"], "dati") };

// Filtri dell'elenco delle notizie: sezione (id) e i suoi argomenti scelti
// (id ripetuto, come testo e senza doppioni).
export const QUERY_NOTIZIE = {
  tag: id,
  sottotag: { predefinito: [], leggi: (valori) => [...new Set(valori.filter(idValido))] },
};
export const QUERY_EDUNEWS24 = {
  scheda: scelta(SEZIONI_EDUNEWS24, SEZIONE_PREDEFINITA),
  area: scelta(AREE_EDUNEWS24),
  categoria: { predefinito: "", leggi: ([valore]) => (slugCategoriaValido(valore) ? valore : "") },
  video: scelta(["1"]),
};

export const QUERY_PROFILO = {
  scheda: scelta(["dati-principali", "utente", "sicurezza"], "dati-principali"),
};
