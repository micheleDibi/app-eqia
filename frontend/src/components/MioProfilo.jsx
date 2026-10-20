import { contenutoPagina } from "../config/styles/pagina.js";
import { pulsante } from "../config/styles/pulsante.js";
import { TESTI_PROFILO as testi } from "../config/testi/profilo.js";
import { useProfilo } from "../hooks/useProfilo.js";
import AlertMessage from "./AlertMessage.jsx";
import IntestazionePagina from "./shared/IntestazionePagina.jsx";
import DettaglioProfilo from "./profilo/DettaglioProfilo.jsx";
import IndicatoreCaricamento from "./shared/IndicatoreCaricamento.jsx";

export default function MioProfilo() {
  const { profilo, errore, caricamento, riprova } = useProfilo();
  return (
    <div className={contenutoPagina("modulo")}>
      <IntestazionePagina titolo={testi.titolo} />
      {caricamento && <IndicatoreCaricamento dimensione="normale" messaggio={testi.caricamento} centrato />}
      {errore && <>
        <AlertMessage message={{ type: "error", text: errore }} />
        <button type="button" onClick={riprova} className={pulsante("secondario")}>{testi.riprova}</button>
      </>}
      {profilo && <DettaglioProfilo profilo={profilo} />}
    </div>
  );
}
