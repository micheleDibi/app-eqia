import CampoModulo from "../shared/CampoModulo.jsx";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import SceltaRelazione from "../gestione/SceltaRelazione.jsx";
import Sottocentri from "../gestione/Sottocentri.jsx";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";

export default function GerarchiaCentro({ pagina }) {
  return <>
    <SezioneModulo titolo={testi.relazioni}>
      <CampoModulo per="padre-centro" etichetta={testi.padreCentro} colonne={6}>
        <SceltaRelazione id="padre-centro" etichetta={testi.padreCentro} tipo="centri"
          valore={pagina.dati.azienda_padre_id} nome={pagina.dati.padre_nome}
          disabilitato={pagina.salvataggio || !pagina.salvata.permessi.gerarchia} onChange={pagina.scegliPadre} />
      </CampoModulo>
    </SezioneModulo>
    <Sottocentri id={pagina.salvata.azienda_id} />
  </>;
}
