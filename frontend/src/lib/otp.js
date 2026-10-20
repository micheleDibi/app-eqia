import { apiFetch, leggiJson } from "./api.js";
import { descriviErrore, ErroreApi, secondiAttesa } from "./erroriApi.js";
import { salvaSessione } from "./sessione.js";

export async function richiestaOtp(url, corpo, accesso = false) {
  const risposta = await apiFetch(url, {
    method: corpo ? "POST" : "GET", auth: !accesso, gestisci401: !accesso,
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  const dati = await leggiJson(risposta);
  if (!risposta.ok) throw new ErroreApi(
    descriviErrore(risposta, dati, "Verifica non riuscita. Riprova."), risposta.status,
    secondiAttesa(risposta.headers.get("Retry-After")),
  );
  return dati;
}

export const operazioniAccessoOtp = {
  invia: (sfida) => richiestaOtp("/auth/rigenera-otp", { sfida: sfida.sfida }, true),
  verifica: async (corpo) => {
    const dati = await richiestaOtp("/auth/verifica-otp", corpo, true);
    salvaSessione(dati);
    return dati;
  },
};

export function operazioniContattoOtp(clienteId, tipo, valore) {
  const base = `/clienti/${clienteId}/contatti/${tipo}`;
  return {
    invia: () => richiestaOtp(`${base}/genera-otp`, { valore }),
    verifica: (corpo) => richiestaOtp(`${base}/verifica-otp`, corpo),
  };
}
