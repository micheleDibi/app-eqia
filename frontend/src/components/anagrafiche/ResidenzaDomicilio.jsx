import { useEffect, useState } from "react";
import { campo } from "../../config/styles/campo.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { DURATA_CONFERMA_AZIONE_MS } from "../../config/interazioni.js";
import { TESTI_RESIDENZA as testi } from "../../config/testi/anagrafica.js";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import CampoModulo from "../shared/CampoModulo.jsx";

// [suffisso, colonne]
const CAMPI_INDIRIZZO = [
  ["Indirizzo", 5],
  ["Civico", 1],
  ["Comune", 3],
  ["Cap", 2],
  ["Provincia", 1],
];
// In residenza CAP e provincia non sono obbligatori.
const OBBLIGATORI_RESIDENZA = new Set(["Indirizzo", "Civico", "Comune"]);

/** @param {{ dati: object, onCambia: Function, onCopiaResidenza: Function }} props */
export default function ResidenzaDomicilio({ dati, onCambia, onCopiaResidenza }) {
  // Il pulsante dice "Residenza copiata in Domicilio" per un momento.
  const [copiata, setCopiata] = useState(false);
  useEffect(() => {
    if (!copiata) return undefined;
    const timer = setTimeout(() => setCopiata(false), DURATA_CONFERMA_AZIONE_MS);
    return () => clearTimeout(timer);
  }, [copiata]);

  const campi = (prefisso) =>
    CAMPI_INDIRIZZO.map(([suffisso, colonne]) => {
      const nome = `${prefisso}${suffisso}`;
      const obbligatorio = prefisso === "residenza" && OBBLIGATORI_RESIDENZA.has(suffisso);
      return (
        <CampoModulo key={nome} per={nome} etichetta={testi.campi[suffisso]} obbligatorio={obbligatorio}
          colonne={colonne}>
          <input id={nome} type="text" name={nome} value={dati[nome]} onChange={onCambia}
            className={campo("comodo")} required={obbligatorio} />
        </CampoModulo>
      );
    });

  return (
    <>
      <SezioneModulo titolo={testi.residenza}>{campi("residenza")}</SezioneModulo>
      <SezioneModulo
        titolo={testi.domicilio}
        descrizione={testi.descrizioneDomicilio}
        azioni={
          <>
            <button
              type="button"
              onClick={() => { onCopiaResidenza(); setCopiata(true); }}
              data-esito={copiata ? "eseguita" : "pronto"}
              className={pulsante("contorno", "piccolo")}
            >
              {copiata ? testi.copiata : testi.copia}
            </button>
            <span role="status" className="sr-only">{copiata ? testi.copiata : ""}</span>
          </>
        }
      >
        {campi("domicilio")}
      </SezioneModulo>
    </>
  );
}
