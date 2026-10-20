import { createPortal } from "react-dom";
import { STILI_SICUREZZA as stili } from "../../config/styles/sicurezza.js";
import Dialogo from "../shared/Dialogo.jsx";

/**
 * Finestra delle procedure di Sicurezza: titolo, spiegazione del passo e il
 * modulo. Finche' una richiesta e' in corso la finestra non si chiude, cosi'
 * la risposta non arriva a un modulo smontato.
 */
export default function DialogoSicurezza({ titolo, descrizione, occupato = false, onChiudi, children }) {
  return createPortal(
    <Dialogo aperto etichetta={titolo} variante="otp" onChiudi={() => { if (!occupato) onChiudi(); }}>
      <div className={stili.dialogo}>
        <header className={stili.dialogoTestata}>
          <h2 className={stili.dialogoTitolo}>{titolo}</h2>
          {descrizione && <p className={stili.dialogoDescrizione}>{descrizione}</p>}
        </header>
        {children}
      </div>
    </Dialogo>,
    document.body,
  );
}
