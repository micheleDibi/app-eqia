import { Link } from "react-router";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import { PERCORSI } from "../../config/routes/percorsi.js";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";
import { STILI_GESTIONE as stili } from "../../config/styles/gestione.js";
import { pulsante } from "../../config/styles/pulsante.js";

export default function CollegamentiCentro({ id }) {
  return <SezioneModulo titolo={testi.personeCentro} griglia={false}>
    <div className={stili.azioni}>
      <Link className={pulsante("secondario")} to={`${PERCORSI.attuatori.elenco}?centro=${id}`}>{testi.attuatore.elenco}</Link>
      <Link className={pulsante("secondario")} to={`${PERCORSI.sottoscrittori.elenco}?centro=${id}`}>{testi.sottoscrittore.elenco}</Link>
    </div>
  </SezioneModulo>;
}
