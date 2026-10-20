import { useState } from "react";
import { STILI_ACCESSO as stili } from "../../config/styles/accesso.js";
import { TESTI_ACCESSO as testi } from "../../config/testi/accesso.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { cambiaMetodo, metodiAlternativi } from "../../lib/secondoFattore.js";
import AlertMessage from "../AlertMessage.jsx";

/**
 * "Usa un altro metodo": la priorita' decide solo cosa proporre, qui
 * l'utente sceglie liberamente tra i metodi che possiede. Il server apre
 * la nuova sfida e chiude quella in corso.
 */
export default function SelettoreMetodo({ sfida, onCambia }) {
  const [aperto, setAperto] = useState(false);
  const [errore, setErrore] = useState("");
  const [occupato, setOccupato] = useState(false);
  const alternativi = metodiAlternativi(sfida);
  if (alternativi.length === 0) return null;

  const scegli = async (metodo) => {
    if (occupato) return;
    setOccupato(true);
    setErrore("");
    try {
      onCambia(await cambiaMetodo(sfida, metodo));
      setAperto(false);
    } catch (erroreApi) {
      setErrore(erroreApi.message);
    } finally {
      setOccupato(false);
    }
  };

  if (!aperto) {
    return (
      <div className={stili.ritorno}>
        <button type="button" className={stili.collegamento} onClick={() => setAperto(true)}>{testi.altroMetodo}</button>
      </div>
    );
  }
  return (
    <div className={stili.contenuto} aria-busy={occupato}>
      <AlertMessage message={errore ? { type: "error", text: errore } : null} separato={false} />
      <p className={stili.nota}>{testi.scegliMetodo}</p>
      {alternativi.map((metodo) => (
        <button key={metodo} type="button" disabled={occupato} onClick={() => void scegli(metodo)}
          className={pulsante("secondario", "grande", { larghezzaPiena: true })}>
          {testi.metodi[metodo]}
        </button>
      ))}
    </div>
  );
}
