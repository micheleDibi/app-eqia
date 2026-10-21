import { Link } from "react-router";
import useSchedaGestione from "../../hooks/useSchedaGestione.js";
import useNavigazioneElenco from "../../hooks/useNavigazioneElenco.js";
import { PERCORSI } from "../../config/routes/percorsi.js";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";
import { STILI_GESTIONE as stili } from "../../config/styles/gestione.js";
import { contenutoPagina } from "../../config/styles/pagina.js";
import { scheda, barraAzioniModulo } from "../../config/styles/superficie.js";
import { pulsante } from "../../config/styles/pulsante.js";
import IntestazionePagina from "../shared/IntestazionePagina.jsx";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import CampoModulo from "../shared/CampoModulo.jsx";
import AlertMessage from "../AlertMessage.jsx";
import DatiCentro from "./DatiCentro.jsx";
import SceltaRelazione from "./SceltaRelazione.jsx";

export default function SchedaCentro({ onCreato }) {
  const form = useSchedaGestione("centro", onCreato);
  const { ritorno } = useNavigazioneElenco(PERCORSI.aziende.elenco);
  return <div className={contenutoPagina("modulo")}>
    <IntestazionePagina titolo={testi.centro.nuovo}
      indietro={{ rotta: ritorno, etichetta: testi.centro.elenco }} />
    <AlertMessage message={form.avviso} />
    <form onSubmit={form.salva} className={scheda()}>
      <DatiCentro form={form} />
      <SezioneModulo titolo={testi.relazioni}>
        <CampoModulo per="padre-centro" etichetta={testi.padreCentro} colonne={6}>
          <SceltaRelazione id="padre-centro" etichetta={testi.padreCentro} tipo="centri" valore={form.dati.azienda_padre_id} nome={form.dati.padre_nome}
            disabilitato={form.salvataggio}
            onChange={r => form.setDati(d => ({ ...d, azienda_padre_id: r?.id ?? null, padre_nome: r?.label }))} />
        </CampoModulo>
      </SezioneModulo>
      <div className={barraAzioniModulo("scheda")}><div className={stili.azioni}>
        <Link to={ritorno} className={pulsante("secondario", "grande")}>{testi.annulla}</Link>
        <button type="submit" disabled={form.salvataggio} className={pulsante("primario", "grande")}>{form.salvataggio ? testi.salvataggio : testi.crea}</button>
      </div></div>
    </form>
  </div>;
}
