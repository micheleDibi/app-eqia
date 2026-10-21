import { useState } from "react";
import DialogoConferma from "../shared/DialogoConferma.jsx";
import { pillola } from "../../config/styles/pillola.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { cambioStato, pillolaStato } from "../../lib/account.js";

/**
 * Pillola dello stato dell'account e, con il permesso, Attiva/Disattiva con
 * la sua conferma. Pillola e pulsante sono in riga: l'etichetta la mette chi
 * compone.
 *
 * @param {{
 *   attivazione: "attivo"|"disattivato"|"in_attesa"|null|undefined,
 *   modificabile?: boolean,
 *   occupato?: boolean,
 *   onCambia: (attivo: boolean) => void,
 *   forma?: "normale"|"grande",
 * }} props
 *   modificabile: mostra Attiva/Disattiva (solo il Nazionale; il server lo
 *   controlla comunque). occupato: un cambio e' in corso.
 */
export default function StatoAccount({ attivazione, modificabile = false, occupato = false, onCambia,
  forma = "normale" }) {
  const [conferma, setConferma] = useState(null);
  const pillolaAccount = pillolaStato(attivazione);
  if (!pillolaAccount) return null;
  const cambio = cambioStato(attivazione);

  return (
    <>
      <span className={pillola(pillolaAccount.tono, forma)}>{pillolaAccount.testo}</span>
      {modificabile && (
        <button type="button" className={pulsante("contorno", "piccolo")} disabled={occupato}
          onClick={() => setConferma(cambio)}>
          {cambio.etichetta}
        </button>
      )}
      <DialogoConferma aperto={Boolean(conferma)} titolo={conferma?.conferma.titolo ?? ""}
        messaggio={conferma?.conferma.messaggio ?? ""} conferma={conferma?.conferma.conferma ?? ""}
        pericolo={conferma?.attivo === false}
        // `?.` anche qui: il React Compiler legge `conferma.attivo` durante
        // il render come dipendenza della funzione, e senza conferma aperta
        // il componente si rompeva.
        onConferma={() => { const attivo = conferma?.attivo; setConferma(null); void onCambia(attivo); }}
        onAnnulla={() => setConferma(null)} />
    </>
  );
}
