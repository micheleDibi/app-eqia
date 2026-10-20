import { STILI_EDUNEWS24, azioneVuoto } from "../../config/styles/edunews24.js";
import { testiVuotoPagina } from "../../lib/edunews24.js";
import Sigillo from "./Sigillo.jsx";

/**
 * Stato vuoto di una scheda della pagina, come un trafiletto allineato a
 * sinistra: sigillo, titolo e riga propri della scheda e dei filtri; con un
 * filtro attivo "Rimuovi il filtro" (con due, "Rimuovi i filtri"). Una pagina
 * vuota con altre voci da caricare non arriva qui: mostra "Carica altri".
 */
export default function StatoVuotoEduNews24({ sezione, filtri, onRimuoviFiltri }) {
  const { titolo, riga, rimuovi } = testiVuotoPagina(sezione, filtri);
  return (
    <div className="edunews24-vuoto">
      <Sigillo />
      <p className={STILI_EDUNEWS24.titoloStato}>{titolo}</p>
      {riga && <p className={STILI_EDUNEWS24.rigaStato}>{riga}</p>}
      {rimuovi && (
        <div className="edunews24-azioni">
          <button type="button" className={azioneVuoto()} onClick={onRimuoviFiltri}>{rimuovi}</button>
        </div>
      )}
    </div>
  );
}
