import { campo } from "../../config/styles/campo.js";
import { nomeRuoloId, opzioniRuolo } from "../../lib/anagrafica.js";

/**
 * Ruolo di un'anagrafica: tendina se chi guarda puo' scegliere (`ruoli`, dal
 * server, con null per il sottoscrittore), altrimenti il ruolo come valore
 * bloccato. Il nome del campo e' `ruolo`, come nel modulo della scheda: le
 * due tendine (Anagrafica e Utente) scrivono lo stesso valore.
 *
 * @param {{ id: string, valore: string, ruoli: (number|null)[], onCambia: Function, soloAttuatori?: boolean }} props
 *   soloAttuatori: la tendina "Ruolo attuatore" della scheda Anagrafica, senza
 *   il sottoscrittore; riportare a sottoscrittore si fa dalla scheda Utente.
 */
export default function SceltaRuolo({ id, valore, ruoli, onCambia, soloAttuatori = false }) {
  const opzioni = opzioniRuolo(ruoli, { soloAttuatori, valore });
  if (opzioni.length > 1) {
    return (
      <select id={id} name="ruolo" value={valore} onChange={onCambia} className={campo("comodo")}>
        {opzioni.map(([codice, etichetta]) => (
          <option key={codice} value={codice}>{etichetta}</option>
        ))}
      </select>
    );
  }
  return <input id={id} type="text" readOnly value={nomeRuoloId(valore)} className={campo("comodo")} />;
}
