import { Link } from "react-router";
import { contenutoPagina } from "../../config/styles/pagina.js";
import { pulsante } from "../../config/styles/pulsante.js";
import IndicatoreCaricamento from "./IndicatoreCaricamento.jsx";
import AlertMessage from "../AlertMessage.jsx";

export default function StatoCaricamentoDettaglio({ loading, errore, ritorno }) {
  return <div className={contenutoPagina("modulo")}>
    {loading ? <IndicatoreCaricamento messaggio="Caricamento…" centrato />
      : <AlertMessage message={{ type: "error", text: errore.message }} />}
    <Link to={ritorno} className={pulsante("secondario")}>Torna all’elenco</Link>
  </div>;
}
