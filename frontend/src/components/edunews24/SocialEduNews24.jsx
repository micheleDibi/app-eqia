import { SOCIAL_EDUNEWS24 } from "../../config/edunews24.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";
import LinkEsterno from "./LinkEsterno.jsx";

// Icona del marchio come maschera CSS (styles/edunews24.css), una classe
// intera per rete.
const ICONE = {
  facebook: "edunews24-social__icona edunews24-social__icona--facebook",
  instagram: "edunews24-social__icona edunews24-social__icona--instagram",
  tiktok: "edunews24-social__icona edunews24-social__icona--tiktok",
};

/**
 * Profili social di EduNews24, dalla sola SOCIAL_EDUNEWS24. Nel modulo solo
 * le icone; nella pagina anche il nome della rete. Il nome accessibile e'
 * sempre "EduNews24 su ..." piu' la nuova scheda.
 */
export default function SocialEduNews24({ variante = "modulo", className = "" }) {
  const pagina = variante === "pagina";
  return (
    <ul role="list" className={["edunews24-social", className].filter(Boolean).join(" ")}
      data-variante={pagina ? "pagina" : "modulo"} aria-label={testi.etichettaSocial}>
      {SOCIAL_EDUNEWS24.filter(({ rete }) => ICONE[rete]).map(({ rete, url }) => (
        <li key={rete}>
          <LinkEsterno href={url} className="edunews24-social__link">
            <span aria-hidden="true" className={ICONE[rete]} />
            {pagina && <span aria-hidden="true" className="edunews24-social__etichetta">{testi.socialBrevi[rete]}</span>}
            <span className="sr-only">{testi.social[rete]}</span>
          </LinkEsterno>
        </li>
      ))}
    </ul>
  );
}
