import { Play } from "../../config/icone.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";
import { formattaDurata } from "../../lib/edunews24.js";

/**
 * Timbro del play dentro la copertina del video: pieno blu con "Guarda il
 * video", poi la durata in un segmento notte. Il testo visibile apre il nome
 * del pulsante; `aggiunta` (nomeGuardaVideo) lo completa per i lettori di
 * schermo, che non leggono la durata breve.
 * `posizione`: "a-cavallo" del bordo inferiore del media (lo spazio sotto e'
 * gia' previsto) oppure "angolo".
 */
export default function TimbroPlay({ durataSecondi, aggiunta, posizione = "a-cavallo" }) {
  const durata = formattaDurata(durataSecondi);
  return (
    <span className="edunews24-timbro-play" data-posizione={posizione === "angolo" ? "angolo" : "a-cavallo"}>
      <span className="edunews24-timbro-play__azione">
        <Play aria-hidden="true" className="edunews24-timbro-play__icona" />
        <span className="edunews24-timbro-play__testo">{testi.guardaVideo}</span>
        {aggiunta && <span className="sr-only">{aggiunta}</span>}
      </span>
      {durata && <span className="edunews24-timbro-play__durata" aria-hidden="true">{durata}</span>}
    </span>
  );
}
