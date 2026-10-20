// Credenziale nel cookie HttpOnly; metadati e CSRF soltanto in memoria.
let sessione = null;
const osservatori = new Set();

function pubblicaSessione(valore) {
  sessione = valore;
  osservatori.forEach((osservatore) => osservatore());
}

export function osservaSessione(osservatore) {
  osservatori.add(osservatore);
  return () => osservatori.delete(osservatore);
}

export function leggiSessione() { return sessione; }

export function rimuoviDepositoLegacy() { /* Equia conserva la sessione soltanto nel cookie. */ }

export function salvaSessione({ utente_id, ruolo_codice, csrf_token, utente_username, nome, cognome }) {
  if (!Number.isInteger(utente_id) || utente_id <= 0 || !/^[a-f0-9]{64}$/.test(csrf_token ?? "")) {
    throw new Error("Risposta del server non valida. Riprova.");
  }
  pubblicaSessione(Object.freeze({
    utenteId: utente_id, ruoloCodice: String(ruolo_codice ?? "").toLowerCase(), csrf: csrf_token,
    username: typeof utente_username === "string" ? utente_username.trim() : "",
    nome: typeof nome === "string" ? nome.trim() : "",
    cognome: typeof cognome === "string" ? cognome.trim() : "",
  }));
  rimuoviDepositoLegacy();
}

export function leggiCsrf() { return sessione?.csrf ?? null; }
export function leggiRuolo() { return sessione?.ruoloCodice ?? ""; }
export function leggiUtenteId() { return sessione?.utenteId ?? null; }
export function haSessione() { return sessione !== null; }
export function pulisciSessione() { pubblicaSessione(null); rimuoviDepositoLegacy(); }

rimuoviDepositoLegacy();
