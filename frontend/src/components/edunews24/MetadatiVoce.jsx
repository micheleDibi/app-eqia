import { STILI_EDUNEWS24, metaVoce } from "../../config/styles/edunews24.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";
import { dataVoce } from "../../lib/edunews24.js";

/**
 * Riga dei metadati di una voce: la data di pubblicazione (se `conData`), i
 * `dettagli` ({ chiave, testo, sr?, className? }: sede, area, figura,
 * posti...) e sempre "Fonte: EduNews24" per ultima fra i dati. Con `sr` il
 * testo breve e' nascosto ai lettori di schermo ("Lombardia, Veneto +2").
 * `children`, solo contenuto in linea, segue la data (il distintivo Video
 * delle voci senza media); `coda`, solo contenuto in linea, segue la fonte
 * (il pulsante Condividi delle notizie della pagina).
 */
export default function MetadatiVoce({
  voce, adesso, conData = true, dettagli = [], className = "", children = null, coda = null,
}) {
  const data = conData ? dataVoce(voce, adesso) : null;
  return (
    <p className={[metaVoce(), "edunews24-voce__meta", className].filter(Boolean).join(" ")}>
      {data && <time dateTime={data.iso} className={STILI_EDUNEWS24.cifre}>{data.testo}</time>}
      {children}
      {dettagli.filter((dettaglio) => dettaglio?.testo).map(({ chiave, testo, sr, className: classe }) => (
        <span key={chiave} className={classe}>
          {sr ? (
            <>
              <span aria-hidden="true">{testo}</span>
              <span className="sr-only">{sr}</span>
            </>
          ) : testo}
        </span>
      ))}
      <span>{testi.fonte}</span>
      {coda}
    </p>
  );
}
