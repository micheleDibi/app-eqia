import { useId, useState } from "react";
import { STILI_SICUREZZA as stili } from "../../config/styles/sicurezza.js";
import { TESTI_SICUREZZA as testi } from "../../config/testi/sicurezza.js";
import { attivaAuthenticator, confermaAuthenticator } from "../../lib/sicurezza.js";
import AlertMessage from "../AlertMessage.jsx";
import DialogoSicurezza from "./DialogoSicurezza.jsx";

/**
 * Attivazione in due passi nella stessa finestra: la password apre un segreto
 * pendente e mostra il QR (una volta sola); il primo codice giusto dell'app lo
 * rende attivo.
 */
export default function AttivazioneAuthenticator({ onFatto, onAnnulla }) {
  const t = testi.authenticator;
  const id = useId();
  const [passo, setPasso] = useState("password");
  const [password, setPassword] = useState("");
  const [codice, setCodice] = useState("");
  const [avvio, setAvvio] = useState(null);
  const [errore, setErrore] = useState("");
  const [occupato, setOccupato] = useState(false);

  const invia = async (evento) => {
    evento.preventDefault();
    if (occupato) return;
    setOccupato(true);
    setErrore("");
    try {
      if (passo === "password") {
        const dati = await attivaAuthenticator(password);
        setPassword("");
        setAvvio(dati);
        setPasso("conferma");
      } else {
        await confermaAuthenticator(codice);
        onFatto(t.attivato);
      }
    } catch (erroreApi) {
      setErrore(erroreApi.message);
    } finally {
      setOccupato(false);
    }
  };

  return (
    <DialogoSicurezza titolo={t.dialogoTitolo} descrizione={passo === "password" ? t.dialogoDescrizione : t.passoQr}
      occupato={occupato} onChiudi={onAnnulla}>
      <form onSubmit={invia} className={stili.modulo} aria-busy={occupato}>
        <AlertMessage message={errore ? { type: "error", text: errore } : null} separato={false} />
        {passo === "password" ? (
          <div>
            <label htmlFor={`${id}-password`} className={stili.etichetta}>{testi.password}</label>
            <input id={`${id}-password`} type="password" autoComplete="current-password" required data-focus-iniziale
              value={password} onChange={(e) => setPassword(e.target.value)} className={stili.campo} />
          </div>
        ) : <>
          <div className={stili.qrRiquadro}>
            <div className={stili.qr}>
              <img className={stili.qrImmagine} alt={t.qrAlt}
                src={`data:image/svg+xml;utf8,${encodeURIComponent(avvio.qr_svg)}`} />
            </div>
          </div>
          <div>
            <span className={stili.etichetta}>{t.chiave}</span>
            <code className={stili.chiave}>{avvio.segreto}</code>
          </div>
          <div>
            <label htmlFor={`${id}-codice`} className={stili.etichetta}>{t.codice}</label>
            <input id={`${id}-codice`} autoFocus inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
              autoComplete="one-time-code" required value={codice} className={stili.campo}
              onChange={(e) => setCodice(e.target.value.replace(/\D/g, "").slice(0, 6))} />
          </div>
        </>}
        <div className={stili.azioni}>
          <button type="submit" className={stili.azionePrimaria}
            disabled={occupato || (passo === "conferma" && codice.length !== 6)}>
            {occupato ? testi.inCorso : passo === "password" ? testi.continua : t.conferma}
          </button>
          <button type="button" className={stili.azioneDiscreta} onClick={onAnnulla} disabled={occupato}>{testi.annulla}</button>
        </div>
      </form>
    </DialogoSicurezza>
  );
}
