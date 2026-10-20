import { Link } from "react-router";
import { ROTTA_INIZIALE } from "../config/routes/percorsi.js";
import { contenutoPagina, descrizionePagina, titoloPagina } from "../config/styles/pagina.js";
import { pulsante } from "../config/styles/pulsante.js";

export default function PaginaNonTrovata() {
  return <section className={contenutoPagina("modulo")} aria-labelledby="pagina-non-trovata">
    <h1 id="pagina-non-trovata" className={titoloPagina()}>Pagina non trovata</h1>
    <p className={`${descrizionePagina()} mt-2 mb-6`}>L’indirizzo non corrisponde a una pagina disponibile.</p>
    <Link to={ROTTA_INIZIALE} className={pulsante("secondario")}>Torna all’applicazione</Link>
  </section>;
}
