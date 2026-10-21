import { useId, useRef } from "react";
import { SlidersHorizontal, X } from "../../config/icone.js";
import { TESTI_ELENCO } from "../../config/testi/elenco.js";
import { pulsante, pulsanteIcona } from "../../config/styles/pulsante.js";
import { usePopoverAncorato } from "../../hooks/usePopoverAncorato.js";

/** Popover nativo: un solo gruppo di campi, fuori dal flusso e sopra lo sticky. */
export default function FiltriElenco({ contenuto, attivi = 0, onAzzera }) {
  const id = useId();
  const comando = useRef(null);
  const pannello = useRef(null);
  usePopoverAncorato(pannello, comando);
  return (
    <div className="filtri-elenco">
      <button ref={comando} type="button" className={`${pulsante(attivi > 0 ? "selezionato" : "secondario")} filtri-elenco__comando`}
        popoverTarget={id} aria-haspopup="dialog" aria-controls={id} aria-label={TESTI_ELENCO.filtri(attivi)}>
        <SlidersHorizontal aria-hidden="true" />
        <span className="filtri-elenco__etichetta" aria-hidden="true">{TESTI_ELENCO.nomeFiltri}</span>
        {attivi > 0 && <span className="filtri-elenco__numero" aria-hidden="true">{attivi}</span>}
      </button>
      <div ref={pannello} id={id} popover="auto" role="dialog"
        aria-labelledby={`${id}-titolo`} className="filtri-elenco__pannello">
        <div className="filtri-elenco__intestazione">
          <h2 id={`${id}-titolo`}>{TESTI_ELENCO.gruppoFiltri}</h2>
          <button type="button" className={pulsanteIcona("neutro", "grande")}
            popoverTarget={id} popoverTargetAction="hide" aria-label={TESTI_ELENCO.chiudiFiltri}><X aria-hidden="true" /></button>
        </div>
        <div className="filtri-elenco__campi">{contenuto}</div>
        <button type="button" className={`${pulsante("discreto")} filtri-elenco__azzera`}
          disabled={!attivi} onClick={onAzzera}>{TESTI_ELENCO.azzeraFiltri}</button>
      </div>
    </div>
  );
}
