import CampoModulo from "../shared/CampoModulo.jsx";
import { campo } from "../../config/styles/campo.js";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";

/** Campi coordinati della stessa sezione; i controlli restano HTML nativi. */
export default function CampiAnagrafica({ campi, dati, onChange, disabilitati = false }) {
  return campi.map(({ nome, etichetta, colonne, opzioni, ...attributi }) => (
    <CampoModulo key={nome} per={nome} etichetta={etichetta} colonne={colonne} obbligatorio={attributi.required}>
      {opzioni ? <select id={nome} name={nome} className={campo("comodo")} value={dati[nome] ?? ""}
        onChange={onChange} required={attributi.required} disabled={disabilitati}>
        <option value="" data-segnaposto>{testi.scegli}</option>
        {opzioni.map(([valore, label]) => <option key={valore} value={valore}>{label}</option>)}
      </select> : <input id={nome} name={nome} className={campo("comodo")} value={dati[nome] ?? ""}
        onChange={onChange} maxLength={255} {...attributi} disabled={disabilitati} />}
    </CampoModulo>
  ));
}
