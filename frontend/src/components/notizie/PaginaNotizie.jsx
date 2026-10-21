import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSessione } from "../../hooks/useSessione.js";
import usePagineRemote from "../../hooks/usePagineRemote.js";
import useQueryPagina from "../../hooks/useQueryPagina.js";
import IntestazionePagina from "../shared/IntestazionePagina.jsx";
import AzioneCrea from "../shared/AzioneCrea.jsx";
import StatoPagineElenco from "../shared/StatoPagineElenco.jsx";
import FiltriElenco from "../shared/FiltriElenco.jsx";
import GestioneTag from "./GestioneTag.jsx";
import { Tags } from "../../config/icone.js";
import { PERCORSI } from "../../config/routes/percorsi.js";
import { QUERY_NOTIZIE } from "../../config/routes/query.js";
import { contenutoPagina } from "../../config/styles/pagina.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { STILI_NOTIZIE as stili } from "../../config/styles/notizie.js";
import { RUOLO_SCRIVE_NOTIZIE, TESTI_NOTIZIE as testi } from "../../config/testi/notizie.js";
import { leggiCategorie, paginaNotizie, queryNotizie } from "../../lib/notizie.js";
import SceltaFiltro from "./FiltroNotizie.jsx";
import VoceNotizia from "./VoceNotizia.jsx";

export default function PaginaNotizie() {
  const navigate = useNavigate();
  const scrive = useSessione()?.ruoloCodice === RUOLO_SCRIVE_NOTIZIE;
  const [filtri, aggiornaFiltri] = useQueryPagina(QUERY_NOTIZIE);
  const [categorie, setCategorie] = useState([]);
  // Cresce quando la gestione delle sezioni cambia qualcosa: i filtri si rileggono.
  const [versioneTag, setVersioneTag] = useState(0);
  const [gestione, setGestione] = useState(false);
  const pagina = usePagineRemote(queryNotizie(undefined, filtri), paginaNotizie, true);
  const conFiltri = Boolean(filtri.tag);
  const vuoto = !pagina.loading && !pagina.errore && pagina.elementi.length === 0;
  const azzera = () => aggiornaFiltri({ tag: "", sottotag: [] });

  useEffect(() => {
    const controllo = new AbortController();
    leggiCategorie(controllo.signal)
      .then((elenco) => { if (!controllo.signal.aborted) setCategorie(elenco); })
      .catch(() => {});
    return () => controllo.abort();
  }, [versioneTag]);

  const chiudiGestione = (cambiati) => {
    setGestione(false);
    if (cambiati) setVersioneTag((v) => v + 1);
  };

  return (
    <div className={`${contenutoPagina()} pagina-notizie`}>
      <IntestazionePagina
        titolo={testi.titolo}
        descrizione={testi.descrizione}
        azioni={<>
          <FiltriElenco attivi={filtri.sottotag.length || Number(conFiltri)} onAzzera={azzera}
            contenuto={<SceltaFiltro categorie={categorie} filtri={filtri} onScegli={aggiornaFiltri} />} />
          {scrive && <>
            <button type="button" className={pulsante("secondario")} aria-label={testi.tagEstesa}
              onClick={() => setGestione(true)}>
              <Tags aria-hidden="true" className="size-4" />{testi.tag}
            </button>
            <AzioneCrea onClick={() => navigate(PERCORSI.notizie.nuovo)} etichetta={testi.nuova}
              etichettaEstesa={testi.nuovaEstesa} />
          </>}
        </>}
      />
      <div aria-busy={pagina.loading}>
        {pagina.elementi.length > 0 && (
          <ul role="list" className={stili.elenco}>
            {pagina.elementi.map((notizia) => <li key={notizia.id}><VoceNotizia notizia={notizia} /></li>)}
          </ul>
        )}
        {vuoto && <p className={stili.vuoto}>{conFiltri ? testi.vuotoFiltri : testi.vuoto}</p>}
        <StatoPagineElenco pagina={pagina} />
      </div>
      {gestione && <GestioneTag onChiudi={chiudiGestione} />}
    </div>
  );
}
