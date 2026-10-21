import { SEGNAPOSTI_ANAGRAFICA, TESTI_DOCUMENTO as testi } from "../../config/testi/anagrafica.js";
import { campo } from "../../config/styles/campo.js";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import CampoModulo from "../shared/CampoModulo.jsx";

/** @param {{ dati: object, onCambia: Function }} props */
export default function DocumentoAnagrafica({ dati, onCambia }) {
  // Un tipo salvato fuori dall'elenco ("Carta d'Identità" storica) resta
  // fra le opzioni: senza, la tendina mostrerebbe il segnaposto.
  const tipi = dati.tipoDocumento && !testi.tipi.some(([valore]) => valore === dati.tipoDocumento)
    ? [...testi.tipi, [dati.tipoDocumento, dati.tipoDocumento]]
    : testi.tipi;
  const testo = (nome, colonne, tipoCampo = "text") => (
    <CampoModulo key={nome} per={nome} etichetta={testi[nome]} obbligatorio colonne={colonne}>
      <input id={nome} type={tipoCampo} name={nome} value={dati[nome]} onChange={onCambia}
        className={campo("comodo")} required />
    </CampoModulo>
  );

  return (
    <SezioneModulo titolo={testi.titolo} descrizione={testi.descrizione}>
      <CampoModulo per="tipoDocumento" etichetta={testi.tipoDocumento} colonne={3}>
        <select id="tipoDocumento" name="tipoDocumento" value={dati.tipoDocumento} onChange={onCambia}
          className={campo("comodo")}>
          <option value="" data-segnaposto>{SEGNAPOSTI_ANAGRAFICA.documento}</option>
          {tipi.map(([valore, etichetta]) => (
            <option key={valore} value={valore}>{etichetta}</option>
          ))}
        </select>
      </CampoModulo>
      {testo("nDocumento", 3)}
      {testo("comuneDiRilascio", 2)}
      {testo("dataRilascio", 2, "date")}
      {testo("dataScadenza", 2, "date")}
    </SezioneModulo>
  );
}
