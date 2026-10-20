import { STILI_NOTIZIE as stili } from "../../config/styles/notizie.js";
import { TESTI_NOTIZIE_DA_LEGGERE as testi } from "../../config/testi/notizie.js";

/** Pallino rosso davanti al titolo di una notizia che l'utente non ha ancora
 * aperto (`letta` falso nella riga dell'elenco); gli screen reader leggono
 * "Da leggere". Nell'elenco delle notizie e nel riquadro della Dashboard. */
export default function PallinoDaLeggere({ notizia }) {
  if (notizia.letta !== false) return null;
  return (
    <>
      <span aria-hidden="true" className={stili.pallinoDaLeggere} />
      <span className="sr-only">{testi.daLeggere}</span>
    </>
  );
}
