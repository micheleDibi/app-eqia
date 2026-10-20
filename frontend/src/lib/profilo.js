import { apiFetch, leggiJson, messaggioErrore } from "./api.js";
import { ErroreApi } from "./erroriApi.js";
import { CAMPI_INDIRIZZO, SEZIONI_PROFILO, TESTI_PROFILO } from "../config/testi/profilo.js";

const testo = (valore) => typeof valore === "string" ? valore.trim() : "";
export const valoreProfilo = (valore) => testo(valore) || TESTI_PROFILO.nonIndicato;

export function nomeProfilo(profilo) {
  const nome = testo(profilo?.nome);
  const cognome = testo(profilo?.cognome);
  return [nome, cognome].filter(Boolean).join(" ") || testo(profilo?.username) || TESTI_PROFILO.account;
}

export function sezioniProfilo(profilo) {
  return SEZIONI_PROFILO.map(({ id, titolo, campo, campi }) => ({
    id, titolo,
    campi: (campi ?? CAMPI_INDIRIZZO).map(([chiave, etichetta]) => ({
      chiave, etichetta, valore: valoreProfilo((campo ? profilo[campo] : profilo)?.[chiave]),
    })),
  }));
}

export async function caricaProfilo(signal) {
  const risposta = await apiFetch("/profilo/me", { cache: "no-store", signal });
  if (!risposta.ok) throw new ErroreApi(await messaggioErrore(risposta, TESTI_PROFILO.errore), risposta.status);
  const profilo = await leggiJson(risposta);
  if (!profilo || typeof profilo.username !== "string" || !profilo.residenza || !profilo.domicilio) {
    throw new ErroreApi(TESTI_PROFILO.errore);
  }
  return profilo;
}
