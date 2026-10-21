import { Plus } from "../../config/icone.js";
import { pulsante } from "../../config/styles/pulsante";

/**
 * Azione principale di una pagina di elenco.
 *
 * L'etichetta visibile e' sempre la forma breve ("Nuovo", "Nuova"): sta
 * accanto al titolo della pagina, che nomina gia' l'entita', quindi scriverla
 * per esteso la ripeterebbe e allargherebbe il pulsante senza aggiungere nulla.
 * Il nome accessibile resta invece quello intero, perche' letto da solo
 * "Nuova" non direbbe di cosa.
 *
 * @param {{
 *   onClick: () => void,
 *   etichetta: string,
 *   etichettaEstesa: string,
 * }} props
 */
export default function AzioneCrea({ onClick, etichetta, etichettaEstesa }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${pulsante()} azione-crea`}
      aria-label={etichettaEstesa}
    >
      <Plus aria-hidden="true" className="azione-crea__icona" />
      <span className="azione-crea__etichetta">{etichetta}</span>
    </button>
  );
}
