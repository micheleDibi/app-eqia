import { useId } from "react";
import { occhiello, sintesi, titoloVoce } from "../../config/styles/edunews24.js";
import { chiaveVoce, haVideo, titoloModulo, varianteRipiego } from "../../lib/edunews24.js";
import ImmagineArticolo from "./ImmagineArticolo.jsx";
import LinkEsterno from "./LinkEsterno.jsx";
import MetadatiVoce from "./MetadatiVoce.jsx";
import PulsanteCondividi from "./PulsanteCondividi.jsx";
import VideoArticolo from "./VideoArticolo.jsx";

/**
 * Apertura delle notizie: il media nella cornice inclinata (il player se la
 * voce ha un video, altrimenti l'immagine o il ripiego blu, caricati subito),
 * l'occhiello di categoria, il titolo che apre l'articolo, la sintesi e i
 * metadati con "Fonte: EduNews24".
 *
 * `contesto`:
 * - "modulo" (Dashboard): id "edunews24-apertura" per le miniature, h3, il
 *   titolo breve su 3 righe con il titolo completo sr-only se diverso
 *   (titoloModulo; lo sr-only resta nella colonna del testo, posizionata);
 *   sintesi su 2 righe, che il CSS mostra solo nel regime ampio.
 *   `cambio` ("si" dopo la scelta di una miniatura) avvia il sipario.
 * - "pagina": h2, titolo completo, sintesi su 3 righe, immagine prioritaria
 *   e "Condividi" in coda ai metadati (nel modulo no: ne cambierebbe
 *   l'altezza).
 *
 * Il chiamante la monta con key=chiaveVoce(voce): cambiare voce smonta e
 * ferma il video.
 */
export default function AperturaNotizia({ voce, adesso, contesto = "modulo", cambio = false, className = "" }) {
  const id = useId();
  const pagina = contesto === "pagina";
  const Titolo = pagina ? "h2" : "h3";
  const titolo = pagina ? { visibile: voce.titolo, aggiunta: "" } : titoloModulo(voce);
  const idVisibile = `${id}-titolo`;
  const idAggiunta = `${id}-titolo-completo`;
  // Il player prende il nome dal titolo della voce (testo visibile e aggiunta).
  const idTitolo = titolo.aggiunta ? `${idVisibile} ${idAggiunta}` : idVisibile;
  const categoria = voce.categoria?.nome ?? null;

  return (
    <div id={pagina ? undefined : "edunews24-apertura"} className={["edunews24-apertura", className].filter(Boolean).join(" ")}
      data-cambio={cambio ? "si" : "no"}>
      <div className="edunews24-apertura__media">
        <div className="edunews24-cornice" data-misura="grande">
          {haVideo(voce) ? (
            <VideoArticolo key={chiaveVoce(voce)} voce={voce} idTitolo={idTitolo} campitura="blu"
              posizioneTimbro="a-cavallo" caricamento="eager" priorita={pagina} />
          ) : (
            <div className="edunews24-media">
              <div className="edunews24-media__quadro">
                <ImmagineArticolo src={voce.immagine} categoria={categoria} campitura="blu"
                  variante={varianteRipiego(voce.id)} caricamento="eager" priorita={pagina} />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="edunews24-apertura__testo">
        {categoria && <p className={occhiello("categoria")}>{categoria}</p>}
        <Titolo className="edunews24-apertura__titolo">
          <LinkEsterno href={voce.url} className="edunews24-voce__link group">
            <span id={idVisibile} className={titoloVoce(null, 3)}>{titolo.visibile}</span>
            {titolo.aggiunta && <span id={idAggiunta} className="sr-only">{titolo.aggiunta}</span>}
          </LinkEsterno>
        </Titolo>
        {voce.sintesi && (
          <div className="edunews24-apertura__sintesi">
            <p className={sintesi(pagina ? 3 : 2)}>{voce.sintesi}</p>
          </div>
        )}
        <MetadatiVoce voce={voce} adesso={adesso} coda={pagina ? <PulsanteCondividi voce={voce} /> : null} />
      </div>
    </div>
  );
}
