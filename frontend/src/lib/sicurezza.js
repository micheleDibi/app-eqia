import { apiFetch, leggiJson } from "./api.js";
import { descriviErrore, ErroreApi, secondiAttesa } from "./erroriApi.js";
import { TESTI_SICUREZZA } from "../config/testi/sicurezza.js";

// Gestione dei propri metodi dal profilo: sessione e CSRF passano da apiFetch.
async function chiama(percorso, opzioni, ripiego) {
  const risposta = await apiFetch(percorso, opzioni);
  const dati = await leggiJson(risposta);
  if (!risposta.ok) {
    throw new ErroreApi(descriviErrore(risposta, dati, ripiego), risposta.status,
      secondiAttesa(risposta.headers.get("Retry-After")));
  }
  return dati;
}

const corpo = (valori) => ({ method: "POST", body: JSON.stringify(valori) });

export const caricaStatoMfa = (signal) =>
  chiama("/auth/mfa", { cache: "no-store", signal }, TESTI_SICUREZZA.erroreStato);

export const attivaAuthenticator = (password) =>
  chiama("/auth/mfa/totp/attiva", corpo({ password }), "Attivazione non riuscita. Riprova.");

export const confermaAuthenticator = (codice) =>
  chiama("/auth/mfa/totp/conferma", corpo({ codice }), "Conferma non riuscita. Riprova.");

export const disattivaAuthenticator = (password, codice) =>
  chiama("/auth/mfa/totp/disattiva", corpo({ password, codice }), "Disattivazione non riuscita. Riprova.");

export const opzioniPasskey = (password) =>
  chiama("/auth/mfa/passkey/opzioni", corpo({ password }), "Avvio della registrazione non riuscito. Riprova.");

export const confermaPasskey = (sfida, credenziale, nome) =>
  chiama("/auth/mfa/passkey/conferma", corpo({ sfida, credenziale, nome }), "Registrazione non riuscita. Riprova.");

export const rimuoviPasskey = (password, id) =>
  chiama("/auth/mfa/passkey/rimuovi", corpo({ password, id }), "Rimozione non riuscita. Riprova.");

export function dataAttivazione(iso) {
  if (!iso) return "";
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "" : data.toLocaleDateString("it-IT");
}
