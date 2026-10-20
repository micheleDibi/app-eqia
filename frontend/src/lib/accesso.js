import { apiFetch, caricaSessione, leggiJson } from "./api.js";
import { descriviErrore, ErroreApi, secondiAttesa } from "./erroriApi.js";
import { salvaSessione } from "./sessione.js";

export async function accedi(username, password) {
  const risposta = await apiFetch("/auth/login", {
    method: "POST", auth: false, gestisci401: false,
    body: JSON.stringify({ utente_username: username, utente_password: password }),
  });
  const dati = await leggiJson(risposta);
  if (!risposta.ok) {
    const ripiego = risposta.status === 401 ? "Username o password errati" : "Risposta del server non valida. Riprova.";
    throw new ErroreApi(descriviErrore(risposta, dati, ripiego), risposta.status, secondiAttesa(risposta.headers.get("Retry-After")));
  }
  if (dati?.requires_2fa) return dati;
  salvaSessione(dati ?? {});
  return true;
}

/**
 * Vero se il browser ha gia' una sessione valida. Serve alla pagina di
 * accesso: chi riapre il sito dalla radice non deve rivedere il form. Il
 * cookie e' HttpOnly, quindi l'unico modo per saperlo e' chiedere al server;
 * un errore di rete vale "no": meglio mostrare il form che bloccare l'ingresso.
 */
export async function sessioneEsistente() {
  try {
    return await caricaSessione();
  } catch {
    return false;
  }
}
