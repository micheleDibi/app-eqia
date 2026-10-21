import SezioneModulo from "../shared/SezioneModulo.jsx";
import CampiAnagrafica from "./CampiAnagrafica.jsx";
import { SEZIONI_CENTRO } from "../../config/campiCentro.js";

export default function DatiCentro({ form }) {
  return SEZIONI_CENTRO.map(s => <SezioneModulo key={s.id} titolo={s.titolo}>
    <CampiAnagrafica campi={s.campi} dati={form.dati} onChange={form.cambia}
      disabilitati={form.salvataggio || (s.id === "identita" && form.salvati && !form.salvati.permessi.identita)} />
  </SezioneModulo>);
}
