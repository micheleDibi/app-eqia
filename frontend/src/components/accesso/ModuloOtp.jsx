import { useId } from "react";
import { useOtp } from "../../hooks/useOtp.js";
import { codicePrecompilato } from "../../lib/otp.js";
import { TESTI_ACCESSO as testi } from "../../config/testi/accesso.js";
import { STILI_ACCESSO as stili } from "../../config/styles/accesso.js";
import { pulsante } from "../../config/styles/pulsante.js";
import AlertMessage from "../AlertMessage.jsx";

/**
 * Inserimento di un codice a sei cifre per una sfida gia' aperta.
 *
 * `nota` sostituisce la frase sul destinatario quando il codice non viene
 * spedito (app di autenticazione); `reinvio={false}` toglie il pulsante di
 * reinvio, che per quei metodi non ha senso.
 */
// La durata dichiarata dal server; 10 minuti per le sfide che non la dicono.
const minuti = (sfida) => Math.max(1, Math.round((sfida.durata_secondi ?? 600) / 60));

export default function ModuloOtp({ iniziale, operazioni, onVerificato, onAnnulla, nota, reinvio = true }) {
  const otp = useOtp({ iniziale, operazioni, onVerificato });
  const id = useId();
  return (
    <form className={stili.modulo} aria-busy={otp.occupato}
      onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); void otp.esegui(Boolean(otp.sfida)); }}>
      <AlertMessage message={otp.errore ? { type: "error", text: otp.errore } : null} separato={false} />
      {otp.sfida ? <>
        <p className={stili.nota}>{nota ?? (codicePrecompilato(otp.sfida)
          ? testi.codicePronto(minuti(otp.sfida)) : testi.codiceInviato(otp.sfida.destinatario, minuti(otp.sfida)))}</p>
        <div>
          <label className={stili.etichetta} htmlFor={id}>Codice di verifica</label>
          <input id={id} autoFocus autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}"
            maxLength={6} required value={otp.codice} className={stili.campo}
            onChange={(e) => otp.setCodice(e.target.value.replace(/\D/g, "").slice(0, 6))} />
        </div>
        <button className={stili.azione} disabled={otp.occupato || otp.codice.length !== 6}>
          {otp.occupato ? "Verifica in corso…" : "Conferma codice"}
        </button>
        {reinvio && <button type="button" className={pulsante("secondario", "grande", { larghezzaPiena: true })}
          disabled={otp.occupato || otp.attesa > 0} onClick={() => void otp.esegui(false)}>
          {otp.attesa > 0 ? `Reinvia tra ${otp.attesa} s` : "Invia un nuovo codice"}
        </button>}
      </> : <button className={stili.azione} disabled={otp.occupato || otp.attesa > 0}>
        {otp.occupato ? "Invio in corso…" : otp.attesa > 0 ? `Invia tra ${otp.attesa} s` : "Invia codice"}
      </button>}
      <button type="button" onClick={onAnnulla} disabled={otp.occupato} className={stili.collegamento}>Indietro</button>
    </form>
  );
}
