import { ROTTE } from "../config/routes/percorsi.js";
const CHIAVE_RITORNO = "eqia_ritorno_accesso";
const PUBBLICHE = new Set([ROTTE.accesso, ROTTE.recuperoPassword, ROTTE.reimpostaPassword]);

export function percorsoSicuro(percorso) {
  if (typeof percorso !== "string" || percorso.length > 2048 || !percorso.startsWith("/")) return null;
  if (percorso.startsWith("//") || percorso.includes("\\") || [...percorso].some((c) => c.charCodeAt(0) < 32)) return null;
  const url = new URL(percorso, window.location.origin);
  const pagina = url.pathname.replace(/\/+$/, "") || "/";
  if (url.origin !== window.location.origin || PUBBLICHE.has(pagina)) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function conservaDestinazione() {
  const { pathname, search, hash } = window.location;
  const destinazione = percorsoSicuro(`${pathname}${search}${hash}`);
  if (!destinazione) return;
  try { window.sessionStorage.setItem(CHIAVE_RITORNO, destinazione); } catch { /* Facoltativo. */ }
}

export function destinazioneDopoAccesso(ripiego) {
  try {
    const percorso = window.sessionStorage.getItem(CHIAVE_RITORNO);
    window.sessionStorage.removeItem(CHIAVE_RITORNO);
    return percorsoSicuro(percorso) ?? ripiego;
  } catch { return ripiego; }
}

export function vaiAlLogin() {
  conservaDestinazione();
  window.location.replace(`${ROTTE.accesso}?sessione=scaduta`);
}
