import { pulsante } from "../../config/styles/pulsante.js";
import { TESTI_ELENCO } from "../../config/testi/elenco.js";
import IndicatoreCaricamento from "./IndicatoreCaricamento.jsx";

export default function StatoPagineElenco({ pagina }) {
  return <div className="stato-pagine-elenco">
    {pagina.loading ? <IndicatoreCaricamento dimensione="compatto" messaggio={TESTI_ELENCO.caricamento} />
      : !pagina.altri && pagina.elementi.length > 0 ? <p role="status">{TESTI_ELENCO.fineElenco}</p> : null}
    {pagina.errore && <p role="alert">{pagina.errore}</p>}
    {(pagina.altri || pagina.errore) && <button type="button" className={pulsante("secondario")}
      onClick={pagina.carica} disabled={pagina.loading}>{pagina.errore ? TESTI_ELENCO.riprova : TESTI_ELENCO.caricaAltri}</button>}
  </div>;
}
