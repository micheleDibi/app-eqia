import { SEGNAPOSTI_ANAGRAFICA, TESTI_INFORMAZIONI as testi } from "../../config/testi/anagrafica.js";
import { campo } from "../../config/styles/campo.js";
import { campoCodiceFiscale } from "../../config/styles/anagrafica.js";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import CampoModulo from "../shared/CampoModulo.jsx";

/** @param {{ dati: object, onCambia: Function, tipo: "sottoscrittore"|"attuatore" }} props */
export default function InformazioniPersonali({ dati, onCambia, tipo }) {
  const testo = (nome, colonne, { obbligatorio, tipoCampo = "text" } = {}) => {
    const codice = nome === "codiceFiscale";
    return (
      <CampoModulo key={nome} per={nome} etichetta={testi[nome]} obbligatorio={obbligatorio} colonne={colonne}>
        <input
          id={nome}
          type={tipoCampo}
          name={nome}
          value={dati[nome]}
          onChange={onCambia}
          className={codice ? campoCodiceFiscale() : campo("comodo")}
          // Il codice fiscale lo controlla il server, e solo se cambia: uno
          // storico non conforme non blocca il salvataggio del resto.
          required={obbligatorio && !codice}
          aria-required={obbligatorio || undefined}
        />
      </CampoModulo>
    );
  };

  return (
    <SezioneModulo titolo={testi.titolo} descrizione={testi.descrizione(tipo)}>
      {testo("nome", 3, { obbligatorio: true })}
      {testo("cognome", 3, { obbligatorio: true })}
      {testo("codiceFiscale", 4, { obbligatorio: true })}
      <CampoModulo per="genere" etichetta={testi.genere} colonne={2}>
        <select id="genere" name="genere" value={dati.genere} onChange={onCambia} className={campo("comodo")}>
          <option value="" data-segnaposto>{SEGNAPOSTI_ANAGRAFICA.genere}</option>
          {testi.generi.map(([valore, etichetta]) => (
            <option key={valore} value={valore}>{etichetta}</option>
          ))}
        </select>
      </CampoModulo>
      {testo("dataDiNascita", 2, { obbligatorio: true, tipoCampo: "date" })}
      {testo("luogoDiNascita", 3, { obbligatorio: true })}
      {testo("provDiNascita", 1)}
      {testo("cittadinanza", 3, { obbligatorio: true })}
    </SezioneModulo>
  );
}
