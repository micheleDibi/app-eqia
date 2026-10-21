import { apiFetch, leggiJson, messaggioErrore } from "./api.js";
import { API_GESTIONE as api } from "../config/api/gestione.js";
import { CAMPI_PERSONA, CAMPI_RELAZIONI_PERSONA, VUOTA_PERSONA } from "../config/campiPersona.js";
import { CAMPI_CENTRO, VUOTO_CENTRO } from "../config/campiCentro.js";

export function percorsoElenco(tipo, filtri = {}) {
  const query = new URLSearchParams({ limit: "40" });
  if (tipo !== "centro") query.set("tipo", tipo);
  for (const [k, v] of Object.entries(filtri)) if (v) query.set(k, v);
  return `${tipo === "centro" ? api.centri : api.persone}?${query}`;
}
export const estraiPaginaGestione = dati => dati;

export async function richiestaGestione(percorso, opzioni) {
  const risposta = await apiFetch(percorso, opzioni);
  if (!risposta.ok) throw Object.assign(new Error(await messaggioErrore(risposta)), { status: risposta.status });
  return leggiJson(risposta);
}
export function leggiScheda(tipo, id, signal) {
  return richiestaGestione(tipo === "centro" ? api.centro(id) : api.persona(id), { signal });
}
export async function nomeCentro(id, signal) {
  const dati = await richiestaGestione(`${api.opzioniCentri}?id=${encodeURIComponent(id)}`, { signal });
  return dati.elementi[0]?.label ?? null;
}
export function salvaScheda(tipo, id, dati) {
  const percorso = id ? (tipo === "centro" ? api.centro(id) : api.persona(id))
    : (tipo === "centro" ? api.centri : `${api.persone}?tipo=${tipo}`);
  return richiestaGestione(percorso, { method: id ? "PUT" : "POST", body: JSON.stringify(payloadGestione(tipo, dati)) });
}
export function valoriIniziali(tipo) {
  return tipo === "centro" ? { ...VUOTO_CENTRO, azienda_padre_id: null }
    : { ...VUOTA_PERSONA, ...Object.fromEntries(CAMPI_RELAZIONI_PERSONA.map(k => [k, null])) };
}
export function payloadGestione(tipo, dati) {
  const campi = tipo === "centro" ? CAMPI_CENTRO : CAMPI_PERSONA;
  const relazioni = tipo === "centro" ? ["azienda_padre_id"] : CAMPI_RELAZIONI_PERSONA;
  return { ...Object.fromEntries(campi.map(c => [c.nome, String(dati[c.nome] ?? "").trim()])),
    ...Object.fromEntries(relazioni.map(k => [k, dati[k] ? Number(dati[k]) : null])) };
}
export function copiaResidenza(dati) {
  const campi = ["indirizzo", "civico", "citta", "CAP", "provincia"];
  return { ...dati, ...Object.fromEntries(campi.map(k => [`cliente_${k}Domicilio`, dati[`cliente_${k}`]])) };
}
export function nomePersona(riga) {
  return [riga.cliente_cognome, riga.cliente_nome].filter(Boolean).join(" ");
}
