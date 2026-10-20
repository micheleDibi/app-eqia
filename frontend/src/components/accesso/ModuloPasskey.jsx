import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "../../config/icone.js";
import { STILI_ACCESSO as stili } from "../../config/styles/accesso.js";
import { TESTI_ACCESSO as testi } from "../../config/testi/accesso.js";
import { ErroreApi } from "../../lib/erroriApi.js";
import { messaggioErrorePasskey, passkeySupportate, usaPasskey } from "../../lib/passkey.js";
import { verificaPasskey } from "../../lib/secondoFattore.js";
import AlertMessage from "../AlertMessage.jsx";

/**
 * Passo passkey al login. Dopo la password il browser chiede subito il
 * telefono (QR o notifica), senza un altro clic; il pulsante serve a
 * riprovare. La risposta firmata torna al server, che emette la sessione.
 */
export default function ModuloPasskey({ sfida, onVerificato, onAnnulla }) {
  const t = testi.passkey;
  const supportate = passkeySupportate();
  const [tentativo, setTentativo] = useState(0);
  const [errore, setErrore] = useState(supportate ? "" : t.nonSupportata);
  const [occupato, setOccupato] = useState(supportate);
  const ultime = useRef({ sfida, onVerificato });
  useEffect(() => { ultime.current = { sfida, onVerificato }; });

  // Il telefono si chiede al montaggio e a ogni "riprova"; lo stato iniziale e'
  // gia' "in attesa" e si scrive solo quando il browser risponde. Smontare il
  // modulo (altro metodo, indietro) annulla la richiesta in corso.
  useEffect(() => {
    if (!supportate) return undefined;
    const controllo = new AbortController();
    usaPasskey(ultime.current.sfida.opzioni, controllo.signal)
      .then((credenziale) => verificaPasskey(ultime.current.sfida, credenziale))
      .then((dati) => { if (!controllo.signal.aborted) ultime.current.onVerificato(dati); })
      .catch((erroreOperazione) => {
        if (controllo.signal.aborted) return;
        setErrore(erroreOperazione instanceof ErroreApi ? erroreOperazione.message : messaggioErrorePasskey(erroreOperazione));
        setOccupato(false);
      });
    return () => controllo.abort();
  }, [supportate, tentativo]);

  const riprova = () => {
    setOccupato(true);
    setErrore("");
    setTentativo((n) => n + 1);
  };

  return (
    <div className={stili.contenuto} aria-busy={occupato}>
      <AlertMessage message={errore ? { type: "error", text: errore } : null} separato={false} />
      <p className={stili.nota}>{t.istruzioni}</p>
      {supportate && (
        <button type="button" className={stili.azione} onClick={riprova} disabled={occupato}>
          {occupato && <LoaderCircle aria-hidden="true" className={stili.caricamento} />}
          {occupato ? t.inCorso : t.riprova}
        </button>
      )}
      <button type="button" onClick={onAnnulla} disabled={occupato} className={stili.collegamento}>Indietro</button>
    </div>
  );
}
