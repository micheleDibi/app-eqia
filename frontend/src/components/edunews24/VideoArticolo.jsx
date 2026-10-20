import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CircleAlert } from "../../config/icone.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";
import { copertinaVideo, nomeGuardaVideo, varianteRipiego, videoRiproducibile } from "../../lib/edunews24.js";
import { avviaEsclusivo, rilasciaVideo, svuotaVideo } from "../../lib/videoEsclusivo.js";
import CopertinaTipografica from "./CopertinaTipografica.jsx";
import DistintivoVideo from "./DistintivoVideo.jsx";
import ImmagineArticolo from "./ImmagineArticolo.jsx";
import LinkEsterno from "./LinkEsterno.jsx";
import TimbroPlay from "./TimbroPlay.jsx";

/**
 * Media di una notizia con video, nel riquadro 16:9 fisso: nessuna misura
 * esterna cambia fra copertina, player ed errore.
 *
 * - Video valido: la copertina e' un pulsante "Guarda il video: {titolo}"
 *   con il timbro del play; al clic si monta il player nativo (controlli,
 *   playsinline, preload none, poster) e parte nel gestore del clic. Nessun
 *   byte del file prima del clic, niente autoplay ne' muted; un solo video
 *   alla volta (videoEsclusivo). Una copertina verticale diventa una
 *   locandina a destra, con il ripiego blu a sinistra. Se il file non si
 *   carica: messaggio neutro e link all'articolo, che il messaggio descrive
 *   (il fuoco, se era sul video, passa al link).
 * - `ha_video` senza video valido: distintivo "Video" e riquadro che apre
 *   l'articolo (link gemello del titolo, fuori dal tab order).
 *
 * Cambiare voce, sezione o filtro lo smonta (key): video e scaricamento fermi.
 * `idTitolo` e' l'id del titolo della voce, che da' il nome al player.
 */
export default function VideoArticolo({
  voce,
  idTitolo,
  campitura = "blu",
  posizioneTimbro = "a-cavallo",
  caricamento = "lazy",
  priorita = false,
}) {
  const [attivo, setAttivo] = useState(false);
  const [errore, setErrore] = useState(false);
  const [orientamento, setOrientamento] = useState("orizzontale");
  const rifVideo = useRef(null);
  const rifLink = useRef(null);
  const idErrore = useId();

  useEffect(() => {
    if (!attivo) return undefined;
    const video = rifVideo.current;
    return () => {
      if (!video) return;
      rilasciaVideo(video);
      svuotaVideo(video);
    };
  }, [attivo]);

  const categoria = voce.categoria?.nome ?? null;
  const variante = varianteRipiego(voce.id);

  if (!videoRiproducibile(voce)) {
    return (
      <div className="edunews24-media" data-orientamento="orizzontale" data-video="gemello">
        <div className="edunews24-media__quadro">
          <ImmagineArticolo src={voce.immagine} categoria={categoria} campitura={campitura} variante={variante}
            caricamento={caricamento} priorita={priorita} />
        </div>
        <LinkEsterno href={voce.url} nascosto className="edunews24-media__gemello" />
        <DistintivoVideo durataSecondi={voce.video?.durata_secondi} />
      </div>
    );
  }

  const copertina = copertinaVideo(voce);
  const nome = nomeGuardaVideo(voce);
  const verticale = orientamento === "verticale";

  function avvia() {
    flushSync(() => setAttivo(true));
    const video = rifVideo.current;
    if (!video) return;
    video.focus();
    video.play()?.catch(() => {});
  }

  function guasto() {
    const video = rifVideo.current;
    const aFuoco = video !== null && document.activeElement === video;
    if (video) rilasciaVideo(video);
    flushSync(() => setErrore(true));
    if (aFuoco) rifLink.current?.focus();
  }

  function leggiOrientamento(evento) {
    const { naturalWidth, naturalHeight } = evento.currentTarget;
    setOrientamento(naturalHeight > naturalWidth ? "verticale" : "orizzontale");
  }

  return (
    <div className="edunews24-media" data-orientamento={orientamento} data-video="player">
      <div className="edunews24-media__quadro">
        {!attivo && verticale && <CopertinaTipografica categoria={categoria} campitura="blu" variante={variante} />}
        {!attivo && (
          <ImmagineArticolo src={copertina} categoria={categoria} campitura={campitura} variante={variante}
            caricamento={caricamento} priorita={priorita} onLoad={leggiOrientamento} />
        )}
        {attivo && !errore && (
          <video ref={rifVideo} className="edunews24-media__player" controls playsInline preload="none"
            poster={copertina ?? undefined} aria-labelledby={idTitolo}
            onPlay={(evento) => avviaEsclusivo(evento.currentTarget)} onError={guasto}>
            <source src={voce.video.url} type={voce.video.tipo_mime} onError={guasto} />
          </video>
        )}
        {attivo && errore && (
          <div className="edunews24-media__errore">
            <CircleAlert aria-hidden="true" className="edunews24-media__errore-icona" />
            <p id={idErrore} className="edunews24-media__errore-testo">{testi.videoNonDisponibile}</p>
            <LinkEsterno href={voce.url} rif={rifLink} descrizione={idErrore}
              className="edunews24-media__errore-link edunews24-anello-doppio">
              {testi.guardaSuEduNews24}
            </LinkEsterno>
          </div>
        )}
      </div>
      {!attivo && (
        <button type="button" className="edunews24-media__copertina edunews24-anello-doppio" onClick={avvia}>
          <TimbroPlay durataSecondi={voce.video.durata_secondi} aggiunta={nome.aggiunta} posizione={posizioneTimbro} />
        </button>
      )}
    </div>
  );
}
