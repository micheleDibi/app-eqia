import { motivoRipiego } from "../../lib/edunews24.js";

const CAMPITURE = ["blu", "velo"];

/**
 * Ripiego tipografico al posto dell'immagine: campitura blu nelle voci
 * grandi, velo nelle altre; la coppia del logo ingrandita e tagliata dal
 * bordo destro in una di tre posizioni (varianteRipiego) e la categoria in
 * basso a sinistra. Decorativo: il titolo della voce dice gia' tutto.
 */
export default function CopertinaTipografica({ categoria, campitura = "velo", variante = 0 }) {
  const numero = Number.isInteger(variante) && variante >= 0 ? variante % 3 : 0;
  const { pieno, bordato } = motivoRipiego(numero);
  return (
    <span className="edunews24-ripiego" data-campitura={CAMPITURE.includes(campitura) ? campitura : "velo"}
      data-variante={String(numero)} aria-hidden="true">
      <svg className="edunews24-ripiego__motivo" viewBox="0 0 160 90" preserveAspectRatio="xMaxYMid slice"
        focusable="false">
        <polygon className="edunews24-ripiego__pieno" points={pieno} />
        <polygon className="edunews24-ripiego__bordato" points={bordato} />
      </svg>
      {categoria && <span className="edunews24-ripiego__categoria">{categoria}</span>}
    </span>
  );
}
