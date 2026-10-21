import useQueryPagina from "../../hooks/useQueryPagina.js";
import useNavigazioneElenco from "../../hooks/useNavigazioneElenco.js";
import usePagineRemote from "../../hooks/usePagineRemote.js";
import useAvvisoArrivato from "../../hooks/useAvvisoArrivato.js";
import AlertMessage from "../AlertMessage.jsx";
import IntestazioneElenco from "../shared/IntestazioneElenco.jsx";
import AzioneCrea from "../shared/AzioneCrea.jsx";
import StatoPagineElenco from "../shared/StatoPagineElenco.jsx";
import RigheGestione from "./RigheGestione.jsx";
import FiltriGestione from "./FiltriGestione.jsx";
import { PERCORSI } from "../../config/routes/percorsi.js";
import { QUERY_GESTIONE } from "../../config/routes/query.js";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";
import { STILI_GESTIONE as stili } from "../../config/styles/gestione.js";
import { campo } from "../../config/styles/campo.js";
import { contenutoPagina } from "../../config/styles/pagina.js";
import { statoVuoto } from "../../config/styles/tabella.js";
import { percorsoElenco, estraiPaginaGestione } from "../../lib/gestione.js";

const CHIAVI = { attuatore: "attuatori", sottoscrittore: "sottoscrittori", centro: "aziende" };

export default function PaginaElencoGestione({ tipo }) {
  const percorsi = PERCORSI[CHIAVI[tipo]];
  const [query, aggiorna] = useQueryPagina(QUERY_GESTIONE);
  const navigazione = useNavigazioneElenco(percorsi.elenco);
  // Esito della scheda da cui si e' appena tornati.
  const avviso = useAvvisoArrivato();
  const pagina = usePagineRemote(percorsoElenco(tipo, { search: query.ricerca, ruolo: query.ruolo, centro: query.centro }), estraiPaginaGestione);
  const ricerca = tipo === "centro" ? testi.ricercaCentro : testi.ricerca;
  const filtri = tipo === "centro" ? undefined : { attivi: Number(Boolean(query.ruolo)) + Number(Boolean(query.centro)),
    onAzzera: () => aggiorna({ ruolo: "", centro: "" }), contenuto: <FiltriGestione tipo={tipo} query={query} aggiorna={aggiorna} /> };
  return <div className={contenutoPagina()}>
    {/* Sopra la testata: testata ed elenco formano un'unica superficie. */}
    <AlertMessage message={avviso} />
    <IntestazioneElenco titolo={testi[tipo].elenco} filtri={filtri}
      azioni={<AzioneCrea etichetta={testi.nuovo} etichettaEstesa={testi[tipo].nuovo} onClick={() => navigazione.apri(percorsi.nuovo)} />}
      ricerca={<input type="search" className={campo("ricerca")} aria-label={ricerca} placeholder={ricerca}
        value={query.ricerca} onChange={e => aggiorna({ ricerca: e.target.value })} />} />
    <div className={stili.elenco}>
      {pagina.elementi.length > 0 && <RigheGestione tipo={tipo} dati={pagina.elementi} percorsi={percorsi} stato={navigazione.stato} titolo={testi[tipo].elenco} />}
      {!pagina.loading && !pagina.errore && !pagina.elementi.length && <p className={statoVuoto()} role="status">{testi[tipo].vuoto}</p>}
      <StatoPagineElenco pagina={pagina} />
    </div>
  </div>;
}
