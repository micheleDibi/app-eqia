import { useState } from "react";
import AlertMessage from "../AlertMessage.jsx";
import { FileDown } from "../../config/icone.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { STILI_NOTIZIE as stili } from "../../config/styles/notizie.js";
import { TESTI_SCHEDA_NOTIZIA as testi } from "../../config/testi/notizie.js";
import { scaricaAllegato } from "../../lib/notizie.js";

export default function Allegati({ scheda }) {
  const [errore, setErrore] = useState(null);
  const scarica = async (allegato) => {
    setErrore(null);
    try {
      await scaricaAllegato(scheda.notizia_id, allegato);
    } catch (e) {
      setErrore({ type: "error", text: e.message });
    }
  };
  return (
    <section className={stili.sezioneAllegati} aria-labelledby="allegati-notizia">
      <h2 id="allegati-notizia" className={stili.titoloAllegati}>{testi.allegati}</h2>
      {errore && <AlertMessage message={errore} separato={false} />}
      <div className={stili.elencoAllegati}>
        {scheda.allegati.map((allegato) => (
          <button key={allegato.notizia_allegato_id} type="button" className={`${pulsante("contorno", "piccolo")} ${stili.allegatoScheda}`}
            aria-label={testi.scarica(allegato.notizia_allegato_nome_file)} onClick={() => scarica(allegato)}>
            <FileDown aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{allegato.notizia_allegato_nome_file}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
