import { createPortal } from "react-dom";
import { pulsante } from "../../config/styles/pulsante.js";
import { STILI_DIALOGO_CONFERMA as stili } from "../../config/styles/dialogoConferma.js";
import Dialogo from "./Dialogo.jsx";

/**
 * Finestra che chiede conferma prima di un'azione, al posto di
 * window.confirm. Il focus parte da Annulla: Invio o un doppio clic
 * distratto non confermano. `pericolo` colora il pulsante di conferma per
 * le azioni che tolgono dati. Portal su document.body, cosi' la finestra
 * non finisce dentro un <form> della pagina.
 */
export default function DialogoConferma({ aperto, titolo, messaggio, conferma, annulla = "Annulla",
  pericolo = false, onConferma, onAnnulla }) {
  return createPortal(
    <Dialogo aperto={aperto} onChiudi={onAnnulla} etichetta={titolo} variante="conferma">
      <div className={stili.contenuto}>
        <div className={stili.testata}>
          <h2 className={stili.titolo}>{titolo}</h2>
          <p className={stili.messaggio}>{messaggio}</p>
        </div>
        <div className={stili.pulsanti}>
          <button type="button" data-focus-iniziale className={pulsante("secondario")} onClick={onAnnulla}>{annulla}</button>
          <button type="button" className={pulsante(pericolo ? "pericolo" : "primario")} onClick={onConferma}>{conferma}</button>
        </div>
      </div>
    </Dialogo>,
    document.body,
  );
}
