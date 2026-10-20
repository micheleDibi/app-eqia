import { TESTI_ACCESSO } from "../config/testi/accesso.js";

// Ponte con navigator.credentials. Il server parla JSON con campi base64url;
// il browser vuole ArrayBuffer e restituisce ArrayBuffer. I browser recenti
// convertono da soli (parse*FromJSON, toJSON); per gli altri si converte qui.

export const b64url = {
  a: (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  da: (testo) => Uint8Array.from(
    atob(testo.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (testo.length % 4)) % 4)),
    (carattere) => carattere.charCodeAt(0),
  ),
};

export function passkeySupportate() {
  return typeof window !== "undefined" && Boolean(window.PublicKeyCredential) && Boolean(globalThis.navigator?.credentials);
}

export function opzioniCreazione(json) {
  if (window.PublicKeyCredential?.parseCreationOptionsFromJSON) return window.PublicKeyCredential.parseCreationOptionsFromJSON(json);
  return {
    ...json,
    challenge: b64url.da(json.challenge),
    user: { ...json.user, id: b64url.da(json.user.id) },
    excludeCredentials: (json.excludeCredentials ?? []).map((c) => ({ ...c, id: b64url.da(c.id) })),
  };
}

export function opzioniRichiesta(json) {
  if (window.PublicKeyCredential?.parseRequestOptionsFromJSON) return window.PublicKeyCredential.parseRequestOptionsFromJSON(json);
  return {
    ...json,
    challenge: b64url.da(json.challenge),
    allowCredentials: (json.allowCredentials ?? []).map((c) => ({ ...c, id: b64url.da(c.id) })),
  };
}

export function serializza(credenziale) {
  if (typeof credenziale.toJSON === "function") return credenziale.toJSON();
  const r = credenziale.response;
  const risposta = { clientDataJSON: b64url.a(r.clientDataJSON) };
  if (r.attestationObject) {
    risposta.attestationObject = b64url.a(r.attestationObject);
    if (typeof r.getTransports === "function") risposta.transports = r.getTransports();
  }
  if (r.authenticatorData) {
    risposta.authenticatorData = b64url.a(r.authenticatorData);
    risposta.signature = b64url.a(r.signature);
    if (r.userHandle) risposta.userHandle = b64url.a(r.userHandle);
  }
  return {
    id: credenziale.id, rawId: b64url.a(credenziale.rawId), type: credenziale.type,
    authenticatorAttachment: credenziale.authenticatorAttachment ?? undefined,
    clientExtensionResults: typeof credenziale.getClientExtensionResults === "function" ? credenziale.getClientExtensionResults() : {},
    response: risposta,
  };
}

// `signal` annulla la richiesta al browser quando chi l'ha aperta viene smontato.
export async function creaPasskey(opzioni, signal) {
  return serializza(await navigator.credentials.create({ publicKey: opzioniCreazione(opzioni), signal }));
}

export async function usaPasskey(opzioni, signal) {
  return serializza(await navigator.credentials.get({ publicKey: opzioniRichiesta(opzioni), signal }));
}

/** Gli errori del browser diventano frasi: l'utente non deve leggere un nome di eccezione. */
export function messaggioErrorePasskey(errore) {
  const t = TESTI_ACCESSO.passkey;
  if (errore?.name === "NotAllowedError" || errore?.name === "AbortError") return t.annullata;
  if (errore?.name === "InvalidStateError") return t.giaRegistrata;
  if (errore?.name === "SecurityError") return t.dominio;
  return errore?.message || t.generico;
}
