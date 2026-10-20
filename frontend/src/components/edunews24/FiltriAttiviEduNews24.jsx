import { useId } from "react";
import { X } from "../../config/icone.js";
import { STILI_EDUNEWS24, azioneRimuoviFiltri } from "../../config/styles/edunews24.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";

/**
 * Seconda riga della barra dei filtri, solo con filtri attivi: le etichette
 * rimovibili ("Categoria: Scuola", "Solo video", "Area: Lombardia") e
 * "Rimuovi filtri". Il nome di ogni etichetta comincia con l'azione e
 * contiene il testo visibile ("Rimuovi il filtro Categoria: Scuola").
 * `attivi` viene da filtriAttivi; dove finisce il fuoco lo decide la barra.
 * Sotto i 40rem di foglio la riga scorre in orizzontale e "Filtri attivi"
 * resta solo per i lettori di schermo (CSS): `onFocus` porta in vista, anello
 * compreso, il controllo a fuoco.
 */
export default function FiltriAttiviEduNews24({ attivi, onRimuovi, onRimuoviTutti, onFocus }) {
  const idTitolo = useId();
  return (
    <div className="edunews24-filtri__attivi" role="group" aria-labelledby={idTitolo} onFocus={onFocus}>
      <span id={idTitolo} className={["edunews24-filtri__titolo-attivi", STILI_EDUNEWS24.etichettaFiltri].join(" ")}>
        {testi.filtriAttivi}
      </span>
      {attivi.map(({ chiave, etichetta, nome }) => (
        <button key={chiave} type="button" className="edunews24-etichetta-filtro" aria-label={nome}
          onClick={() => onRimuovi(chiave)}>
          {etichetta}
          <X aria-hidden="true" className={STILI_EDUNEWS24.iconaPiccola} />
        </button>
      ))}
      <button type="button" className={azioneRimuoviFiltri()} onClick={onRimuoviTutti}>{testi.rimuoviFiltri}</button>
    </div>
  );
}
