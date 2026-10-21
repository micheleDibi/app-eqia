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
import StatoCaricamentoDettaglio from "../shared/StatoCaricamentoDettaglio.jsx";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import CampoModulo from "../shared/CampoModulo.jsx";
import PaginaNonTrovata from "../PaginaNonTrovata.jsx";
import AlertMessage from "../AlertMessage.jsx";
import DatiCentro from "./DatiCentro.jsx";
import SceltaRelazione from "./SceltaRelazione.jsx";
import CollegamentiCentro from "./CollegamentiCentro.jsx";
import Sottocentri from "./Sottocentri.jsx";

export default function SchedaCentro({ id, onCreato }) {
  const form = useSchedaGestione("centro", id, onCreato);
  const { ritorno } = useNavigazioneElenco(PERCORSI.aziende.elenco);
  if (form.errore?.status === 404) return <PaginaNonTrovata />;
  if (form.loading || form.errore) return <StatoCaricamentoDettaglio {...form} ritorno={ritorno} />;
  return <div className={contenutoPagina("modulo")}>
    <IntestazionePagina titolo={id ? testi.centro.scheda : testi.centro.nuovo} descrizione={form.salvati?.azienda_ragione_sociale}
      indietro={{ rotta: ritorno, etichetta: testi.centro.elenco }} />
    <AlertMessage message={form.avviso} />
    <form onSubmit={form.salva} className={scheda()}>
      <DatiCentro form={form} />
      <SezioneModulo titolo={testi.relazioni}>
        <CampoModulo per="padre-centro" etichetta={testi.padreCentro} colonne={6}>
          <SceltaRelazione id="padre-centro" etichetta={testi.padreCentro} tipo="centri" valore={form.dati.azienda_padre_id} nome={form.dati.padre_nome}
            disabilitato={form.salvataggio || (id && !form.salvati.permessi.gerarchia)}
            onChange={r => form.setDati(d => ({ ...d, azienda_padre_id: r?.id ?? null, padre_nome: r?.label }))} />
        </CampoModulo>
        {id && <CampoModulo per="codice-centro" etichetta={testi.codice} colonne={6}>
          <p id="codice-centro" className={stili.valore}>{form.salvati.azienda_codice_nazionale}</p>
        </CampoModulo>}
      </SezioneModulo>
      {id && <><Sottocentri id={id} /><CollegamentiCentro id={id} /></>}
      <div className={barraAzioniModulo("scheda")}><div className={stili.azioni}>
        <Link to={ritorno} className={pulsante("secondario", "grande")}>{testi.annulla}</Link>
        <button type="submit" disabled={form.salvataggio} className={pulsante("primario", "grande")}>{form.salvataggio ? testi.salvataggio : id ? testi.salva : testi.crea}</button>
      </div></div>
    </form>
  </div>;
}
