import { STILI_EDUNEWS24 } from "../../config/styles/edunews24.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";
import Sigillo from "./Sigillo.jsx";

/**
 * Pagina con la funzione spenta: sotto la testata un pannello neutro che lo
 * spiega, senza schede, filtri, errori ne' pulsanti. Non e' un errore.
 */
export default function StatoDisattivataEduNews24() {
  return (
    <div className="edunews24-disattivata">
      <Sigillo />
      <h2 className={STILI_EDUNEWS24.titoloStato}>{testi.disattivataTitolo}</h2>
      <p className={STILI_EDUNEWS24.rigaStato}>{testi.disattivata}</p>
    </div>
  );
}
