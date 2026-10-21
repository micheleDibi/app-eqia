import { Link } from "react-router";
import { ChevronRight } from "../../config/icone.js";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";

export default function TabellaGestione({ righe, colonne, percorsi, stato, titolo }) {
  return <table className="gestione-elenco__tabella">
    <caption className="sr-only">{titolo}</caption>
    <thead><tr>{colonne.map(c => <th scope="col" key={c.id}>{c.etichetta}</th>)}<th scope="col"><span className="sr-only">{testi.scheda}</span></th></tr></thead>
    <tbody>{righe.map(r => <tr key={r.id}>
      {colonne.map((c, i) => <td key={c.id}>{i === 0
        ? <Link className="gestione-elenco__nome" to={percorsi.dettaglio(r.id)} state={stato}>{r.campi[c.id]}</Link>
        : r.campi[c.id] || testi.nessuno}</td>)}
      <td className="gestione-elenco__azione"><Link to={percorsi.dettaglio(r.id)} state={stato} aria-label={testi.apri(r.nome)}
        className="gestione-elenco__apri"><ChevronRight aria-hidden="true" /></Link></td>
    </tr>)}</tbody>
  </table>;
}
