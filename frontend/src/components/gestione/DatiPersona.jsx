import SezioneModulo from "../shared/SezioneModulo.jsx";
import CampiAnagrafica from "./CampiAnagrafica.jsx";
import { SEZIONI_PERSONA } from "../../config/campiPersona.js";
import { copiaResidenza } from "../../lib/gestione.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";

export default function DatiPersona({ form, disabilitato }) {
  return SEZIONI_PERSONA.map(sezione => <SezioneModulo key={sezione.id} titolo={sezione.titolo}
    azioni={sezione.id === "domicilio" && !disabilitato ? <button type="button" className={pulsante("ausiliario", "piccolo")}
      onClick={() => form.setDati(copiaResidenza)}>{testi.copiaResidenza}</button> : undefined}>
    <CampiAnagrafica campi={sezione.campi} dati={form.dati} onChange={form.cambia} disabilitati={disabilitato} />
  </SezioneModulo>);
}
