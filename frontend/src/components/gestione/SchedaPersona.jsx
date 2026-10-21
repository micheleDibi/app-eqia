import { Link } from "react-router";
import useSchedaGestione from "../../hooks/useSchedaGestione.js";
import useNavigazioneElenco from "../../hooks/useNavigazioneElenco.js";
import { useSessione } from "../../hooks/useSessione.js";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";
import { STILI_GESTIONE as stili } from "../../config/styles/gestione.js";
import { contenutoPagina } from "../../config/styles/pagina.js";
import { scheda, barraAzioniModulo } from "../../config/styles/superficie.js";
import { pulsante } from "../../config/styles/pulsante.js";
import IntestazionePagina from "../shared/IntestazionePagina.jsx";
import AlertMessage from "../AlertMessage.jsx";
import DatiPersona from "./DatiPersona.jsx";
import RelazioniPersona from "./RelazioniPersona.jsx";
export default function SchedaPersona({ tipo, percorsi, onCreato }) {
  const form = useSchedaGestione(tipo, onCreato);
  const { ruoloCodice } = useSessione();
  const { ritorno } = useNavigazioneElenco(percorsi.elenco);
  return <div className={contenutoPagina("modulo")}>
    <IntestazionePagina titolo={testi[tipo].nuovo} indietro={{ rotta: ritorno, etichetta: testi[tipo].elenco }} />
    <AlertMessage message={form.avviso} />
    <form onSubmit={form.salva} className={`${scheda()} ${stili.modulo}`}>
      <DatiPersona form={form} disabilitato={form.salvataggio} />
      <RelazioniPersona tipo={tipo} form={form} ruolo={ruoloCodice} disabilitato={form.salvataggio} />
      <div className={barraAzioniModulo("scheda")}><div className={stili.azioni}>
        <Link to={ritorno} className={pulsante("secondario", "grande")}>{testi.annulla}</Link>
        <button type="submit" disabled={form.salvataggio} className={pulsante("primario", "grande")}>{form.salvataggio ? testi.salvataggio : testi.crea}</button>
      </div></div>
    </form>
  </div>;
}
