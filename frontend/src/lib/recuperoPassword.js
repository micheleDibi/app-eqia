import { apiFetch, leggiJson } from "./api.js";
import { regoleDaCodiciServer } from "./passwordPolicy.js";
import { TESTI_RESET } from "../config/testi/accesso.js";

const PUBBLICA = { auth: false, gestisci401: false };

export async function richiediRecupero(email) {
  try {
    await apiFetch("/auth/password-reset/request", {
      ...PUBBLICA, method: "POST", body: JSON.stringify({ email }),
    });
  } catch {
    // Contratto anti-enumerazione esistente: esito identico, anche offline.
  }
}

export async function verificaLinkReset(token) {
  try {
    const risposta = await apiFetch(`/auth/password-reset/validate?token=${encodeURIComponent(token)}`, PUBBLICA);
    const dati = await leggiJson(risposta);
    return dati?.valido === true ? { stato: "valido" } : { stato: "non_valido", motivo: dati?.motivo ?? "non_valido" };
  } catch {
    return { stato: "non_valido", motivo: "rete" };
  }
}

export async function confermaReset({ token, password, conferma }) {
  try {
    const risposta = await apiFetch("/auth/password-reset/confirm", {
      ...PUBBLICA, method: "POST", body: JSON.stringify({ token, password, password_conferma: conferma }),
    });
    if (risposta.ok) return { ok: true };
    const dettaglio = (await leggiJson(risposta))?.detail;
    return {
      ok: false,
      regoleRifiutate: regoleDaCodiciServer(dettaglio?.regole_violate),
      errore: dettaglio?.messaggi?.join(" ") ?? (typeof dettaglio === "string" ? dettaglio : TESTI_RESET.errore),
    };
  } catch {
    return { ok: false, errore: TESTI_RESET.rete, regoleRifiutate: [] };
  }
}
