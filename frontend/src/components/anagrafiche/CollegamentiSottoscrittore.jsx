import CampoModulo from "../shared/CampoModulo.jsx";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import SceltaRelazione from "../gestione/SceltaRelazione.jsx";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";

export default function CollegamentiSottoscrittore({ dati, onScegli }) {
  return <SezioneModulo titolo={testi.relazioni}>
    <CampoModulo per="centro-sottoscrittore" etichetta={testi.centroLabel}>
      <SceltaRelazione id="centro-sottoscrittore" etichetta={testi.centroLabel} tipo="centri"
        valore={dati.centroId} nome={dati.centroNome}
        onChange={riga => onScegli("centroId", "centroNome", riga)} />
    </CampoModulo>
    <CampoModulo per="attuatore-sottoscrittore" etichetta={testi.referente}>
      <SceltaRelazione id="attuatore-sottoscrittore" etichetta={testi.referente} tipo="attuatori"
        valore={dati.attuatoreId} nome={dati.attuatoreNome}
        onChange={riga => onScegli("attuatoreId", "attuatoreNome", riga)} />
    </CampoModulo>
  </SezioneModulo>;
}
