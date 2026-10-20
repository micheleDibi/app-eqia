import { useId, useState } from "react";
import { STILI_SICUREZZA as stili } from "../../config/styles/sicurezza.js";
import { TESTI_SICUREZZA as testi } from "../../config/testi/sicurezza.js";
import { disattivaAuthenticator } from "../../lib/sicurezza.js";
import AlertMessage from "../AlertMessage.jsx";
import DialogoSicurezza from "./DialogoSicurezza.jsx";

/** Disattivazione: password e un codice corrente, in un solo passo. */
export default function DisattivazioneAuthenticator({ onFatto, onAnnulla }) {
  const t = testi.authenticator;
  const id = useId();
  const [password, setPassword] = useState("");
  const [codice, setCodice] = useState("");
  const [errore, setErrore] = useState("");
  const [occupato, setOccupato] = useState(false);

  const invia = async (evento) => {
    evento.preventDefault();
    if (occupato) return;
    setOccupato(true);
    setErrore("");
    try {
      await disattivaAuthenticator(password, codice);
      onFatto(t.disattivato);
    } catch (erroreApi) {
      setErrore(erroreApi.message);
    } finally {
      setOccupato(false);
    }
  };

  return (
    <DialogoSicurezza titolo={t.disattivaTitolo} descrizione={t.disattivaDescrizione} occupato={occupato} onChiudi={onAnnulla}>
      <form onSubmit={invia} className={stili.modulo} aria-busy={occupato}>
        <AlertMessage message={errore ? { type: "error", text: errore } : null} separato={false} />
        <div>
          <label htmlFor={`${id}-password`} className={stili.etichetta}>{testi.password}</label>
          <input id={`${id}-password`} type="password" autoComplete="current-password" required data-focus-iniziale
            value={password} onChange={(e) => setPassword(e.target.value)} className={stili.campo} />
        </div>
        <div>
          <label htmlFor={`${id}-codice`} className={stili.etichetta}>{t.codice}</label>
          <input id={`${id}-codice`} inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
            autoComplete="one-time-code" required value={codice} className={stili.campo}
            onChange={(e) => setCodice(e.target.value.replace(/\D/g, "").slice(0, 6))} />
        </div>
        <div className={stili.azioni}>
          <button type="submit" className={stili.azionePericolo} disabled={occupato || codice.length !== 6}>
            {occupato ? testi.inCorso : t.disattivaConferma}
          </button>
          <button type="button" className={stili.azioneDiscreta} onClick={onAnnulla} disabled={occupato}>{testi.annulla}</button>
        </div>
      </form>
    </DialogoSicurezza>
  );
}
