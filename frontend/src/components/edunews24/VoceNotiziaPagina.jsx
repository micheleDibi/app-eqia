import { useId } from "react";
import { occhiello, sintesi, titoloVoce } from "../../config/styles/edunews24.js";
import { chiaveVoce, formaVocePagina, haVideo, varianteRipiego } from "../../lib/edunews24.js";
import DistintivoVideo from "./DistintivoVideo.jsx";
import ImmagineArticolo from "./ImmagineArticolo.jsx";
import LinkEsterno from "./LinkEsterno.jsx";
import MetadatiVoce from "./MetadatiVoce.jsx";
import PulsanteCondividi from "./PulsanteCondividi.jsx";
import VideoArticolo from "./VideoArticolo.jsx";

/**
 * Voce di una notizia nella pagina (secondari della prima pagina e bande di
 * "Altre notizie"): media, occhiello di categoria, titolo completo che apre
 * l'articolo (link esteso a tutta la voce), sintesi se prevista e metadati
 * con "Fonte: EduNews24" e, in coda, "Condividi" (in ogni forma).
 *
 * - `forma` (data-forma, impaginata dal CSS): "scheda" (media sopra),
 *   "compatta" (miniatura di 7rem a sinistra sotto i 40rem di pannello,
 *   scheda sopra), "fascia" (media e testo affiancati dai 40rem) o "testo"
 *   (senza media). Una voce "compatta" senza immagine diventa "testo"
 *   (formaVocePagina): nei posti piccoli niente ripiego.
 * - `player`: con un video, il player nativo al posto dell'immagine (solo
 *   nelle voci grandi); altrove il distintivo "Video", sul media o, nella
 *   forma "testo", nei metadati dopo la data: occhielli e titoli del trio
 *   partono cosi' alla stessa altezza in tutte le colonne.
 * - `campitura` del ripiego: "blu" nelle voci grandi, "velo" nelle altre,
 *   dove compare solo se l'immagine non si carica.
 * - `ruolo` e `righeSintesi`: taglio del titolo e righe della sintesi (0:
 *   nessuna). Una voce di solo testo ha sempre almeno 3 righe di sintesi,
 *   come il trio: prende il posto del media, e accanto al ripiego grande
 *   della coppia la voce non resta un titolo isolato.
 */
export default function VoceNotiziaPagina({
  voce,
  adesso,
  forma = "compatta",
  player = false,
  campitura = "velo",
  ruolo = "titolo",
  righeSintesi = 0,
  className = "",
}) {
  const id = useId();
  const idTitolo = `${id}-titolo`;
  const categoria = voce.categoria?.nome ?? null;
  const video = haVideo(voce);
  const formaVoce = formaVocePagina(forma, voce);
  const righe = formaVoce === "testo" ? Math.max(righeSintesi, 3) : righeSintesi;

  return (
    <div className={["edunews24-voce", className].filter(Boolean).join(" ")} data-forma={formaVoce}>
      {formaVoce !== "testo" && (
        <div className="edunews24-voce__media">
          {player && video ? (
            <VideoArticolo key={chiaveVoce(voce)} voce={voce} idTitolo={idTitolo} campitura={campitura}
              posizioneTimbro="a-cavallo" />
          ) : (
            <div className="edunews24-media">
              <div className="edunews24-media__quadro">
                <ImmagineArticolo src={voce.immagine} categoria={categoria} campitura={campitura}
                  variante={varianteRipiego(voce.id)} />
              </div>
              {video && <DistintivoVideo durataSecondi={voce.video?.durata_secondi} />}
            </div>
          )}
        </div>
      )}
      <div className="edunews24-voce__testo">
        {categoria && <p className={occhiello("categoria")}>{categoria}</p>}
        <h3 className="edunews24-voce__titolo">
          <LinkEsterno href={voce.url} className="edunews24-voce__link group">
            <span id={idTitolo} className={titoloVoce(ruolo, 3)}>{voce.titolo}</span>
          </LinkEsterno>
        </h3>
        {righe > 0 && voce.sintesi && <p className={sintesi(righe)}>{voce.sintesi}</p>}
        <MetadatiVoce voce={voce} adesso={adesso} coda={<PulsanteCondividi voce={voce} />}>
          {formaVoce === "testo" && video && <DistintivoVideo durataSecondi={voce.video?.durata_secondi} />}
        </MetadatiVoce>
      </div>
    </div>
  );
}
