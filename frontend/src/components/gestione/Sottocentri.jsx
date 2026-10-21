import { Link } from "react-router";
import usePagineRemote from "../../hooks/usePagineRemote.js";
import StatoPagineElenco from "../shared/StatoPagineElenco.jsx";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import { API_GESTIONE as api } from "../../config/api/gestione.js";
import { PERCORSI } from "../../config/routes/percorsi.js";
import { estraiPaginaGestione } from "../../lib/gestione.js";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";
import { STILI_GESTIONE as stili } from "../../config/styles/gestione.js";

export default function Sottocentri({ id }) {
  const pagina = usePagineRemote(`${api.centriFigli(id)}?limit=40`, estraiPaginaGestione);
  return <SezioneModulo titolo={testi.sediFiglie} griglia={false}>
    <div className={stili.risultati}>{pagina.elementi.map(r => <Link key={r.id} className={stili.opzione}
      to={PERCORSI.aziende.dettaglio(r.id)}>{r.label}</Link>)}</div>
    {!pagina.loading && !pagina.errore && !pagina.elementi.length && <p className={stili.testo}>{testi.senzaFigli}</p>}
    <StatoPagineElenco pagina={pagina} />
  </SezioneModulo>;
}
