import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle } from "../../config/icone.js";
import { STILI_SICUREZZA as stili } from "../../config/styles/sicurezza.js";
import { TESTI_SICUREZZA as testi } from "../../config/testi/sicurezza.js";
import { ErroreApi } from "../../lib/erroriApi.js";
import { creaPasskey, messaggioErrorePasskey, passkeySupportate } from "../../lib/passkey.js";
import { confermaPasskey, opzioniPasskey } from "../../lib/sicurezza.js";
import AlertMessage from "../AlertMessage.jsx";
import DialogoSicurezza from "./DialogoSicurezza.jsx";

/**
 * Nome e password in un solo modulo: confermata la password, il browser chiede
 * subito il telefono e la passkey si salva da sola. Se il telefono non
 * risponde si riprova senza ridigitare la password, finche' la sfida del
 * server vale; se il server la respinge si torna al modulo.
 */
export default function AggiuntaPasskey({ onFatto, onAnnulla }) {
  const t = testi.passkey;
  const id = useId();
  const supportate = passkeySupportate();
  const [nome, setNome] = useState(t.nomeSuggerito);
  const [password, setPassword] = useState("");
  const [avvio, setAvvio] = useState(null);      // sfida e opzioni del server
  const [fase, setFase] = useState("modulo");    // modulo | telefono | riprova
  const [errore, setErrore] = useState(supportate ? "" : t.nonSupportata);
  const controllo = useRef(null);
  useEffect(() => () => controllo.current?.abort(), []);

  const registra = async (dati) => {
    setFase("telefono");
    setErrore("");
    controllo.current = new AbortController();
    try {
      const credenziale = await creaPasskey(dati.opzioni, controllo.current.signal);
      await confermaPasskey(dati.sfida, credenziale, nome.trim());
      onFatto(t.aggiunta);
    } catch (erroreOperazione) {
      if (controllo.current.signal.aborted) return;
      if (erroreOperazione instanceof ErroreApi) {
        setAvvio(null);
        setFase("modulo");
        setErrore(erroreOperazione.message);
      } else {
        setFase("riprova");
        setErrore(messaggioErrorePasskey(erroreOperazione));
      }
    }
  };

  const invia = async (evento) => {
    evento.preventDefault();
    if (fase !== "modulo") return;
    setFase("telefono");
    setErrore("");
    try {
      const dati = await opzioniPasskey(password);
      setPassword("");
      setAvvio(dati);
      await registra(dati);
    } catch (erroreApi) {
      setFase("modulo");
      setErrore(erroreApi.message);
    }
  };

  const occupato = fase === "telefono";
  return (
    <DialogoSicurezza titolo={t.dialogoTitolo} descrizione={t.dialogoDescrizione} occupato={occupato} onChiudi={onAnnulla}>
      <form onSubmit={invia} className={stili.modulo} aria-busy={occupato}>
        <AlertMessage message={errore ? { type: "error", text: errore } : null} separato={false} />
        {fase === "modulo" ? <>
          <div>
            <label htmlFor={`${id}-nome`} className={stili.etichetta}>{t.nome}</label>
            <input id={`${id}-nome`} type="text" required maxLength={80} data-focus-iniziale
              value={nome} onChange={(e) => setNome(e.target.value)} className={stili.campo} />
          </div>
          <div>
            <label htmlFor={`${id}-password`} className={stili.etichetta}>{testi.password}</label>
            <input id={`${id}-password`} type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)} className={stili.campo} />
          </div>
        </> : <p className={stili.passi}>{t.passoTelefono}</p>}
        {occupato && (
          <p className={stili.attesa} role="status">
            <LoaderCircle aria-hidden="true" className={stili.attesaIcona} />{t.inAttesa}
          </p>
        )}
        <div className={stili.azioni}>
          {fase === "riprova"
            ? <button type="button" className={stili.azionePrimaria} onClick={() => void registra(avvio)}>{t.riprova}</button>
            : <button type="submit" className={stili.azionePrimaria} disabled={occupato || !supportate || !nome.trim()}>
              {occupato ? testi.inCorso : testi.continua}
            </button>}
          <button type="button" className={stili.azioneDiscreta} onClick={onAnnulla} disabled={occupato}>{testi.annulla}</button>
        </div>
      </form>
    </DialogoSicurezza>
  );
}
