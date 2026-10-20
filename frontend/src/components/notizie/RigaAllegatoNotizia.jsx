import { X } from "../../config/icone.js";
import { pulsanteIcona } from "../../config/styles/pulsante.js";
import { STILI_NOTIZIE as stili } from "../../config/styles/notizie.js";
import { TESTI_MODULO_NOTIZIA as testi } from "../../config/testi/notizie.js";

export default function RigaAllegato({ nome, daCaricare = false, disattivo, onTogli }) {
  return (
    <li className={stili.allegato}>
      <span className={stili.nomeAllegato}>
        {nome}{daCaricare && <span className={stili.daCaricare}>{testi.allegati.daCaricare}</span>}
      </span>
      <button type="button" className={pulsanteIcona("pericolo", "minima")} disabled={disattivo}
        aria-label={testi.allegati.togli(nome)} onClick={onTogli}>
        <X aria-hidden="true" />
      </button>
    </li>
  );
}
