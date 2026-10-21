import { createPortal } from "react-dom";
import Dialogo from "../shared/Dialogo.jsx";
import ModuloOtp from "../accesso/ModuloOtp.jsx";
import { operazioniContattoOtp } from "../../lib/otp.js";
import { STILI_ACCESSO as stili } from "../../config/styles/accesso.js";
import { TESTI_ACCOUNT as testi } from "../../config/testi/account.js";

/** Finestra della verifica di un contatto: invio del codice alla persona,
 * inserimento da parte di chi lavora sulla scheda. */
export default function DialogoVerifica({ clienteId, contatto, onVerificato, onChiudi }) {
  const operazioni = operazioniContattoOtp(clienteId, contatto.tipo, contatto.valore);
  return createPortal(<Dialogo aperto onChiudi={onChiudi} etichetta={testi.dialogo.etichetta} variante="otp">
    <div className="dialogo__contenuto overflow-y-auto">
      <header className={stili.intestazione}>
        <h2 className={stili.titolo}>{testi.dialogo.titolo(contatto.tipo)}</h2>
        <p className={stili.descrizione}>{testi.dialogo.descrizione(contatto.valore)}</p>
      </header>
      <ModuloOtp operazioni={operazioni} onVerificato={onVerificato} onAnnulla={onChiudi} />
    </div>
  </Dialogo>, document.body);
}
