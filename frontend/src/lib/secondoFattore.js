import { operazioniAccessoOtp, richiestaOtp } from "./otp.js";
import { salvaSessione } from "./sessione.js";

// Passo del secondo fattore al login: nessuna sessione ancora, la sfida
// emessa dopo la password e' la prova del primo fattore.
export const operazioniAccessoTotp = {
  invia: null, // il codice lo fa il telefono: niente reinvio
  verifica: async (corpo) => {
    const dati = await richiestaOtp("/auth/mfa/verifica-totp", corpo, true);
    salvaSessione(dati);
    return dati;
  },
};

export function operazioniPerMetodo(metodo) {
  return metodo === "totp" ? operazioniAccessoTotp : operazioniAccessoOtp;
}

/** La risposta del telefono alla sfida passkey completa la sessione. */
export async function verificaPasskey(sfida, credenziale) {
  const dati = await richiestaOtp("/auth/mfa/verifica-passkey", { sfida: sfida.sfida, credenziale }, true);
  salvaSessione(dati);
  return dati;
}

/** "Usa un altro metodo": restituisce la nuova sfida, gia' nel formato del login. */
export function cambiaMetodo(sfida, metodo) {
  return richiestaOtp("/auth/mfa/metodo", { sfida: sfida.sfida, metodo }, true);
}

/** I metodi tra cui scegliere, oltre a quello in corso. */
export function metodiAlternativi(sfida) {
  return (sfida?.metodi ?? []).filter((metodo) => metodo !== sfida.metodo);
}
