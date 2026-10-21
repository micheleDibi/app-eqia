import { apiFetch, leggiJson } from "./api.js";
import { descriviErrore, ErroreApi } from "./erroriApi.js";
import { salvaSessione } from "./sessione.js";
import { RUOLI } from "../config/ruoli.js";
import { PERCORSI } from "../config/routes/percorsi.js";
import { TESTI_ANAGRAFICA as testi, TESTI_CENTRO, TESTI_PADRE, TESTI_UTENTE } from "../config/testi/anagrafica.js";

// Scheda di sottoscrittori e attuatori: backend/src/clienti/scheda.py. Il
// modulo a video usa nomi brevi, le colonne di `clienti` restano qui.

/** [campo del modulo, colonna] */
const CAMPI = [
  ["nome", "cliente_nome"],
  ["cognome", "cliente_cognome"],
  ["codiceFiscale", "cliente_codice_fiscale"],
  ["genere", "cliente_sesso"],
  ["dataDiNascita", "cliente_dataNascita"],
  ["luogoDiNascita", "cliente_luogoNascita"],
  ["provDiNascita", "cliente_provinciaNascita"],
  ["cittadinanza", "cliente_cittadinanza"],
  ["email", "cliente_email"],
  ["cellulare", "cliente_cellulare"],
  ["pec", "cliente_pec"],
  ["telefono", "cliente_telefono"],
  ["tipoDocumento", "cliente_tipoDocumento"],
  ["nDocumento", "cliente_documento"],
  ["comuneDiRilascio", "cliente_comuneRilascio"],
  ["dataRilascio", "cliente_dataRilascio"],
  ["dataScadenza", "cliente_dataScadenzaDocumento"],
  ["residenzaIndirizzo", "cliente_indirizzo"],
  ["residenzaCivico", "cliente_civico"],
  ["residenzaComune", "cliente_citta"],
  ["residenzaCap", "cliente_CAP"],
  ["residenzaProvincia", "cliente_provincia"],
  ["domicilioIndirizzo", "cliente_indirizzoDomicilio"],
  ["domicilioCivico", "cliente_civicoDomicilio"],
  ["domicilioComune", "cliente_cittaDomicilio"],
  ["domicilioCap", "cliente_CAPDomicilio"],
  ["domicilioProvincia", "cliente_provinciaDomicilio"],
];
// Colonne NOT NULL: una data svuotata non si manda vuota ma null, e il server
// risponde con il campo obbligatorio invece di un errore di formato.
const DATE = new Set(["dataDiNascita", "dataRilascio", "dataScadenza"]);
const SUFFISSI_INDIRIZZO = ["Indirizzo", "Civico", "Comune", "Cap", "Provincia"];

/** Il modulo prima della lettura: tutti i campi vuoti. */
export const ANAGRAFICA_VUOTA = Object.freeze({
  ...Object.fromEntries(CAMPI.map(([campo]) => [campo, ""])),
  ruolo: "",
  username: "",
  padre: null,
});

/**
 * I valori del modulo letti da una scheda del server. Dell'account: nome
 * utente e padre ({ utente_id, nome }), che cambia solo il Nazionale.
 */
export function datiModulo(scheda) {
  return {
    ...Object.fromEntries(CAMPI.map(([campo, colonna]) => [campo, scheda[colonna] ?? ""])),
    ruolo: scheda.cliente_ruolo == null ? "" : String(scheda.cliente_ruolo),
    username: scheda.account?.username ?? "",
    padre: scheda.account?.padre ?? null,
  };
}

/**
 * Le sole colonne cambiate rispetto ai valori salvati, pronte per il PUT:
 * il server controlla codice fiscale, email e scadenza solo se cambiano, e
 * un dato storico non toccato non deve bloccare il resto.
 */
export function modificheAnagrafica(dati, salvati) {
  const modifiche = {};
  for (const [campo, colonna] of CAMPI) {
    if (dati[campo] === salvati[campo]) continue;
    modifiche[colonna] = DATE.has(campo) && dati[campo] === "" ? null : dati[campo];
  }
  if (dati.ruolo !== salvati.ruolo) modifiche.cliente_ruolo = dati.ruolo === "" ? null : Number(dati.ruolo);
  if (dati.username !== salvati.username) modifiche.utente_username = dati.username;
  const padre = dati.padre?.utente_id ?? null;
  if (padre !== (salvati.padre?.utente_id ?? null)) modifiche.utente_padre = padre;
  return modifiche;
}

/** Il padre scelto nella finestra: id dell'utente e nome da mostrare. */
export function padreScelto(voce) {
  return {
    utente_id: voce.utente_id,
    nome: `${voce.cliente_nome ?? ""} ${voce.cliente_cognome ?? ""}`.trim() || String(voce.utente_id),
  };
}

/** Il domicilio uguale alla residenza ("Copia da residenza"). */
export function copiaResidenza(dati) {
  return {
    ...dati,
    ...Object.fromEntries(SUFFISSI_INDIRIZZO.map((suffisso) => [`domicilio${suffisso}`, dati[`residenza${suffisso}`]])),
  };
}

/** Schede della pagina: il Centro solo per gli attuatori. */
export function schedeAnagrafica(tipo) {
  return ["dati-principali", ...(tipo === "attuatore" ? ["centro"] : []), "utente"];
}

/** La scheda richiesta dall'indirizzo, se esiste per questo tipo. */
export function schedaAttiva(tipo, richiesta) {
  const schede = schedeAnagrafica(tipo);
  return schede.includes(richiesta) ? richiesta : schede[0];
}

/** "Mario Rossi", dai valori salvati e non da quelli che si stanno scrivendo. */
export function nominativo(scheda) {
  return `${scheda?.cliente_nome ?? ""} ${scheda?.cliente_cognome ?? ""}`.trim();
}

/** Nome del ruolo dal suo id; per un sottoscrittore nessun ruolo di accesso. */
export function nomeRuoloId(id) {
  if (id === null || id === undefined || id === "") return TESTI_UTENTE.senzaRuolo;
  return RUOLI.find((ruolo) => ruolo.id === Number(id))?.nome ?? String(id);
}

/**
 * Le opzioni della tendina del ruolo: [valore, etichetta]. null e' il
 * sottoscrittore, valore "" come nel modulo. `soloAttuatori` (la tendina
 * "Ruolo attuatore") lo toglie, salvo che sia la scelta attuale.
 */
export function opzioniRuolo(ids, { soloAttuatori = false, valore = "" } = {}) {
  return ids
    .filter((id) => !(soloAttuatori && id === null && valore !== ""))
    .map((id) => [id === null ? "" : String(id), nomeRuoloId(id)]);
}

/** Il percorso della scheda per il tipo che l'anagrafica ha dopo un salvataggio. */
export function rotteTipo(tipo) {
  return tipo === "attuatore" ? PERCORSI.attuatori : PERCORSI.sottoscrittori;
}

/**
 * Data della cronologia: solo il giorno ("21/10/2026") o giorno e ora
 * ("21/10/2026, 10:30:00"); vuota se assente. Un giorno senza ora non passa
 * da Date, che lo leggerebbe in UTC.
 */
export function dataCronologia(valore) {
  if (!valore) return "";
  const giorno = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valore);
  if (giorno) return `${giorno[3]}/${giorno[2]}/${giorno[1]}`;
  return new Date(valore).toLocaleString("it-IT");
}

async function json(risposta, errore) {
  const dati = await leggiJson(risposta);
  if (!risposta.ok) throw new ErroreApi(descriviErrore(risposta, dati, errore), risposta.status);
  return dati;
}

export async function leggiAnagrafica(clienteId, signal) {
  return json(await apiFetch(`/clienti/${clienteId}`, { signal, cache: "no-store" }), testi.erroreLettura);
}

/** Salva le modifiche; risponde con la scheda aggiornata. */
export async function salvaAnagrafica(clienteId, modifiche) {
  const risposta = await apiFetch(`/clienti/${clienteId}`, { method: "PUT", body: JSON.stringify(modifiche) });
  return json(risposta, testi.erroreSalvataggio);
}

/**
 * Associa (id), cambia o rimuove (null) il centro di un attuatore, subito;
 * risponde con la scheda aggiornata.
 */
export async function cambiaCentroAttuatore(clienteId, aziendaId) {
  const risposta = await apiFetch(`/clienti/${clienteId}/centro`, {
    method: "PUT", body: JSON.stringify({ azienda_id: aziendaId }),
  });
  return json(risposta, TESTI_CENTRO.erroreAssociazione);
}

/**
 * Gli attuatori fra cui scegliere il padre (solo il Nazionale), a pagine:
 * `dopo` e' quanti se ne sono gia' letti. Risponde { voci, altri }.
 */
export async function leggiPadri(clienteId, { cerca = "", ruolo = "", dopo = 0 } = {}, signal) {
  const parametri = new URLSearchParams({ cerca, dopo: String(dopo) });
  if (ruolo) parametri.set("ruolo", ruolo);
  return json(await apiFetch(`/clienti/${clienteId}/padri?${parametri}`, { signal, cache: "no-store" }),
    TESTI_PADRE.erroreLettura);
}

/** "Accedi con questo utente": la sessione diventa quella della persona. */
export async function accediCome(utenteId) {
  const risposta = await apiFetch(`/auth/login-as/${utenteId}`, { method: "POST" });
  salvaSessione(await json(risposta, TESTI_UTENTE.erroreAccesso));
}
