import { useId, useState } from "react";
import { STILI_SICUREZZA as stili } from "../../config/styles/sicurezza.js";
import { TESTI_SICUREZZA as testi } from "../../config/testi/sicurezza.js";
import { rimuoviPasskey } from "../../lib/sicurezza.js";
import AlertMessage from "../AlertMessage.jsx";
import DialogoSicurezza from "./DialogoSicurezza.jsx";

/** Rimozione di una passkey: basta la password, la passkey potrebbe non essere piu' a portata. */
export default function RimozionePasskey({ passkey, onFatto, onAnnulla }) {
  const t = testi.passkey;
  const id = useId();
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState("");
  const [occupato, setOccupato] = useState(false);

  const invia = async (evento) => {
    evento.preventDefault();
    if (occupato) return;
    setOccupato(true);
    setErrore("");
    try {
      await rimuoviPasskey(password, passkey.id);
      onFatto(t.rimossa);
    } catch (erroreApi) {
      setErrore(erroreApi.message);
    } finally {
      setOccupato(false);
    }
  };

  return (
    <DialogoSicurezza titolo={t.rimozioneTitolo} descrizione={t.rimozioneDescrizione(passkey.nome)} occupato={occupato} onChiudi={onAnnulla}>
      <form onSubmit={invia} className={stili.modulo} aria-busy={occupato}>
        <AlertMessage message={errore ? { type: "error", text: errore } : null} separato={false} />
        <div>
          <label htmlFor={`${id}-password`} className={stili.etichetta}>{testi.password}</label>
          <input id={`${id}-password`} type="password" autoComplete="current-password" required data-focus-iniziale
            value={password} onChange={(e) => setPassword(e.target.value)} className={stili.campo} />
        </div>
        <div className={stili.azioni}>
          <button type="submit" className={stili.azionePericolo} disabled={occupato}>{occupato ? testi.inCorso : t.rimuovi}</button>
          <button type="button" className={stili.azioneDiscreta} onClick={onAnnulla} disabled={occupato}>{testi.annulla}</button>
        </div>
      </form>
    </DialogoSicurezza>
  );
}
