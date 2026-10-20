import { apiFetch, leggiJson } from "./api.js";
import { descriviErrore, ErroreApi } from "./erroriApi.js";
import { richiestaOtp } from "./otp.js";
import { TESTI_ACCOUNT as testi } from "../config/testi/account.js";

// Account di un'anagrafica: backend/src/otp/contatti.py (contatti e stato) e
// backend/src/account/routers.py (cambio di stato, solo Nazionale).

/** Contatti e stato dell'account: `{ email, cellulare, attivazione }`. */
export const leggiAccount = (clienteId) => richiestaOtp(`/clienti/${clienteId}/contatti`);

/** Attiva o disattiva l'account; risponde come leggiAccount. */
export async function cambiaStatoAccount(clienteId, attivo) {
  const risposta = await apiFetch(`/clienti/${clienteId}/account/stato`, {
    method: "PUT", body: JSON.stringify({ attivo }),
  });
  const dati = await leggiJson(risposta);
  if (!risposta.ok) throw new ErroreApi(descriviErrore(risposta, dati, testi.stato.erroreSalvataggio), risposta.status);
  return dati;
}

/**
 * Cosa mostra un recapito: verificato solo se il valore a video e' quello
 * salvato; "Verifica" finche' non lo e', attivo solo con un valore salvato;
 * l'invito a salvare se il valore a video e' diverso.
 */
export function statoRecapito(verifica, valore) {
  const disponibile = Boolean(verifica?.disponibile);
  const salvato = verifica?.stato?.valore === valore;
  const verificato = Boolean(salvato && valore && verifica?.stato?.verificato);
  return {
    verificato,
    verificatoIl: verificato ? verifica?.stato?.verificato_il ?? null : null,
    mostraVerifica: disponibile && !verificato,
    verificaDisabilitata: !salvato || !valore,
    daSalvare: disponibile && !salvato && Boolean(valore),
  };
}

/** Data e ora della verifica di un recapito: "12/09/2024, 17:24". */
export function dataVerifica(valore) {
  return new Date(valore).toLocaleDateString("it-IT", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Pillola dello stato dell'account; null finche' lo stato non e' arrivato. */
export function pillolaStato(attivazione) {
  return testi.stato.valori[attivazione] ?? null;
}

/** Il cambio proposto dal pulsante e la sua conferma: attivo -> disattiva,
 * altrimenti attiva (a mano, con l'avviso se l'account era in attesa). */
export function cambioStato(attivazione) {
  const c = testi.stato.conferma;
  if (attivazione === "attivo") return { attivo: false, etichetta: testi.stato.disattiva, conferma: c.disattiva };
  return {
    attivo: true,
    etichetta: testi.stato.attiva,
    conferma: attivazione === "in_attesa" ? c.attivaInAttesa : c.riattiva,
  };
}
