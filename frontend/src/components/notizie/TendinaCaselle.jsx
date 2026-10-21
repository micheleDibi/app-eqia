import { useId, useRef } from "react";
import { ChevronDown } from "../../config/icone.js";
import { STILI_NOTIZIE as stili } from "../../config/styles/notizie.js";
import { usePopoverAncorato } from "../../hooks/usePopoverAncorato.js";
import { alternaScelta } from "../../lib/notizie.js";

/**
 * Tendina con le caselle, per i gruppi dei destinatari e per i sottotag: il
 * comando ha l'aspetto di una select e dice cosa e' spuntato (`testo`); il
 * pannello (popover nativo, come i filtri degli elenchi) ha una casella per
 * opzione. Escape e un clic fuori lo chiudono.
 *
 * @param {{ id: string, etichetta: string, opzioni: { valore: string|number, etichetta: string }[],
 *   scelti: (string|number)[], testo: string, onCambia: (scelti: (string|number)[]) => void,
 *   disattivata?: boolean, descrittaDa?: string }} props
 *   etichetta: quella del campo, nel nome accessibile; testo: il riassunto delle scelte
 */
export default function TendinaCaselle({ id, etichetta, opzioni, scelti, testo, onCambia, disattivata = false,
  descrittaDa }) {
  const pannelloId = useId();
  const comando = useRef(null);
  const pannello = useRef(null);
  usePopoverAncorato(pannello, comando);
  // Il pannello e' largo quanto il comando, come le opzioni di una select.
  const allarga = () => pannello.current?.style.setProperty("--larghezza-comando", `${comando.current.offsetWidth}px`);

  return (
    <>
      <button ref={comando} id={id} type="button" className={stili.comandoGruppi} onClick={allarga}
        disabled={disattivata} popoverTarget={pannelloId} aria-haspopup="true" aria-controls={pannelloId}
        aria-describedby={descrittaDa} aria-label={`${etichetta}: ${testo}`}>
        <span className="truncate">{testo}</span>
        <ChevronDown aria-hidden="true" className={stili.frecciaGruppi} />
      </button>
      <div ref={pannello} id={pannelloId} popover="auto" data-allinea="inizio" role="group"
        aria-label={etichetta} className="notizie-gruppi__pannello">
        {opzioni.map((opzione) => (
          <label key={opzione.valore} className={stili.opzioneGruppo}>
            <input type="checkbox" className={stili.casellaGruppo} checked={scelti.includes(opzione.valore)}
              onChange={() => onCambia(alternaScelta(scelti, opzione.valore, opzioni))} />
            {opzione.etichetta}
          </label>
        ))}
      </div>
    </>
  );
}
