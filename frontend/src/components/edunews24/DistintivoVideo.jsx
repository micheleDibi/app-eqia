import { Video } from "../../config/icone.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";
import { descriviDurata, formattaDurata } from "../../lib/edunews24.js";

/**
 * Distintivo "Video" con la durata breve (icona piu' testo, mai la sola
 * icona). Dentro un `.edunews24-media` si posa nell'angolo in basso a
 * sinistra. Con `nascosto` tace per i lettori di schermo: nella miniatura il
 * video e la durata sono gia' nel nome del pulsante (titoloModulo).
 */
export default function DistintivoVideo({ durataSecondi, nascosto = false }) {
  const breve = formattaDurata(durataSecondi);
  const estesa = nascosto ? null : descriviDurata(durataSecondi);
  return (
    <span className="edunews24-distintivo-video" aria-hidden={nascosto ? "true" : undefined}>
      <Video aria-hidden="true" className="edunews24-distintivo-video__icona" />
      <span>{testi.video}</span>
      {breve && <span aria-hidden="true">{breve}</span>}
      {estesa && <span className="sr-only">{estesa}</span>}
    </span>
  );
}
