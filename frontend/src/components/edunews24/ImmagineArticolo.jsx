import { useState } from "react";
import { immagineUtilizzabile } from "../../lib/edunews24.js";
import CopertinaTipografica from "./CopertinaTipografica.jsx";

/**
 * Immagine di un articolo dentro `.edunews24-media__quadro` (16:9 fisso):
 * misure dichiarate, lazy tranne l'apertura, nessun crossorigin. Senza
 * immagine utilizzabile, o se il caricamento fallisce, il ripiego tipografico
 * nello stesso riquadro: nessun salto. Il fallimento e' la src fallita, senza
 * effetti: una src nuova riprova da sola.
 */
export default function ImmagineArticolo({
  src,
  categoria,
  campitura = "velo",
  variante = 0,
  larghezza = 1600,
  altezza = 900,
  caricamento = "lazy",
  priorita = false,
  onLoad,
}) {
  const [fallita, setFallita] = useState(null);
  if (!immagineUtilizzabile(src) || fallita === src) {
    return <CopertinaTipografica categoria={categoria} campitura={campitura} variante={variante} />;
  }
  return (
    <img className="edunews24-media__immagine" src={src} width={larghezza} height={altezza} alt=""
      loading={caricamento === "eager" ? "eager" : "lazy"} decoding="async"
      fetchPriority={priorita ? "high" : undefined} onError={() => setFallita(src)} onLoad={onLoad} />
  );
}
