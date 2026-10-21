import { Link } from "react-router";
import { ChevronRight } from "../../config/icone.js";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";

export default function ListaGestione({ righe, colonne, percorsi, stato }) {
  return <ul className="gestione-elenco__lista">{righe.map(r => <li key={r.id}>
    <Link className="gestione-elenco__riga" to={percorsi.dettaglio(r.id)} state={stato}>
      <div><span className="gestione-elenco__nome">{r.nome}</span>
        <dl>{colonne.slice(1).map(c => <div key={c.id}><dt>{c.etichetta}</dt><dd>{r.campi[c.id] || testi.nessuno}</dd></div>)}</dl>
      </div><ChevronRight aria-hidden="true" />
    </Link>
  </li>)}</ul>;
}
