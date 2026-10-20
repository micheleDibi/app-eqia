import { pulsante } from "../../config/styles/pulsante.js";
import { TESTI_GESTIONE_TAG as testi } from "../../config/testi/notizie.js";

export default function Interruttore({ attivo, nome, disattivo, onCambia }) {
  return (
    <button type="button" className={`${pulsante("discreto", "minimo")} ml-auto`} disabled={disattivo}
      aria-label={attivo ? testi.disattivaNome(nome) : testi.riattivaNome(nome)} onClick={() => onCambia(!attivo)}>
      {attivo ? testi.disattiva : testi.riattiva}
    </button>
  );
}
