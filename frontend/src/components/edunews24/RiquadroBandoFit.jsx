import { useId } from "react";
import { POSIZIONI_BANDOFIT } from "../../config/edunews24.js";
import { LOGO_BANDOFIT } from "../../config/identita.js";
import { STILI_LOGO } from "../../config/styles/identita.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";
import { urlBandoFit } from "../../lib/edunews24.js";
import LinkEsterno from "./LinkEsterno.jsx";

const INDIRIZZO = urlBandoFit(POSIZIONI_BANDOFIT.pagina);

/**
 * BandoFit nella scheda Bandi della pagina: logo, "Supporto alla
 * candidatura", una frase e il link. La regione complementare prende il nome
 * dal logo. Il titolo e' un paragrafo, non un titolo di sezione. Impilato
 * sotto i 40rem di pannello, su una riga sopra (styles/bandofit.css). Nessuna
 * prop: il posto lo da' l'involucro della pagina.
 */
export default function RiquadroBandoFit() {
  const idLogo = useId();
  return (
    <aside className="bandofit-riquadro" aria-labelledby={idLogo}>
      <img {...LOGO_BANDOFIT} id={idLogo} className={STILI_LOGO.bandoFitRiquadro} />
      <div className="bandofit-riquadro__testi">
        <p className="bandofit-riquadro__titolo">{testi.bandoFit.titolo}</p>
        <p className="bandofit-riquadro__testo">{testi.bandoFit.testo}</p>
      </div>
      <LinkEsterno href={INDIRIZZO} className="bandofit-riquadro__link min-h-11">{testi.bandoFit.link}</LinkEsterno>
    </aside>
  );
}
