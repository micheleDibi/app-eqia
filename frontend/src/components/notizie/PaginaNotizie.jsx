import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useSessione } from "../../hooks/useSessione.js";
import usePagineRemote from "../../hooks/usePagineRemote.js";
import useQueryPagina from "../../hooks/useQueryPagina.js";
import IntestazionePagina from "../shared/IntestazionePagina.jsx";
import AzioneCrea from "../shared/AzioneCrea.jsx";
import StatoPagineElenco from "../shared/StatoPagineElenco.jsx";
import FiltriElenco from "../shared/FiltriElenco.jsx";
import GestioneTag from "./GestioneTag.jsx";
import PallinoDaLeggere from "./PallinoDaLeggere.jsx";
import { Check, ChevronDown, ChevronRight, Tags } from "../../config/icone.js";
import { PERCORSI } from "../../config/routes/percorsi.js";
import { QUERY_NOTIZIE } from "../../config/routes/query.js";
import { contenutoPagina } from "../../config/styles/pagina.js";
import { pillola } from "../../config/styles/pillola.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { STILI_NOTIZIE as stili } from "../../config/styles/notizie.js";
import { RUOLO_SCRIVE_NOTIZIE, TESTI_NOTIZIE as testi } from "../../config/testi/notizie.js";
import {
  dataNotizia, filtroConSottotag, leggiCategorie, paginaNotizie, queryNotizie, sommarioNotizia,
} from "../../lib/notizie.js";

/** Le notizie del Nazionale, dalla piu' recente, a blocchi mentre si
 * scorre. "Filtri" sceglie una sezione o uno o piu' suoi argomenti, che
 * restano nell'indirizzo della pagina. Il Nazionale le vede tutte e ha anche
 * "Sezioni" e "+ Nuova"; gli altri vedono quelle di cui sono destinatari (lo
 * decide il backend, src/notizie/routers.py). */
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

/** Il contenuto del pannello Filtri, come un menu: "Tutte le notizie", poi
 * le sezioni; le voci scelte hanno lo sfondo e la spunta a destra. La
 * sezione mostra tutte le sue notizie. Gli argomenti si vedono solo sotto la
 * sezione del filtro: un clic su una sezione che ne ha la sceglie e li apre,
 * con il pannello aperto; un clic su un argomento lo aggiunge o lo toglie
 * (le notizie con almeno uno degli argomenti scelti) e il pannello resta
 * aperto. "Tutte le notizie" e le sezioni senza argomenti scelgono e
 * chiudono il pannello. */
function SceltaFiltro({ categorie, filtri, onScegli }) {
  const scegli = (evento, valori, chiudi) => {
    onScegli(valori);
    if (chiudi) evento.currentTarget.closest("[popover]")?.hidePopover();
  };
  const voce = (etichetta, scelta, valori, { chiudi = true, aperta } = {}) => {
    const Freccia = aperta ? ChevronDown : ChevronRight;
    return (
      <button type="button" aria-pressed={scelta} aria-expanded={aperta}
        onClick={(e) => scegli(e, valori, chiudi)} className={scelta ? stili.voceFiltroScelta : stili.voceFiltro}>
        <span className={stili.nomeVoceFiltro}>
          {etichetta}
          {aperta !== undefined && <Freccia aria-hidden="true" className={stili.frecciaFiltro} />}
        </span>
        {scelta && <Check aria-hidden="true" className={stili.spuntaFiltro} />}
      </button>
    );
  };
  return (
    <ul role="list" aria-label={testi.sceltaFiltro} className={stili.vociFiltro}>
      <li>{voce(testi.tutteLeNotizie, !filtri.tag, { tag: "", sottotag: [] })}</li>
      {categorie.map((c) => {
        const tag = String(c.tag_id);
        const conArgomenti = c.sottotag.length > 0;
        const aperta = conArgomenti ? filtri.tag === tag : undefined;
        return (
          <li key={tag}>
            {voce(c.tag_descrizione, filtri.tag === tag && filtri.sottotag.length === 0, { tag, sottotag: [] },
              { chiudi: !conArgomenti, aperta })}
            {aperta && (
              <ul role="list" className={stili.argomentiFiltro}>
                {c.sottotag.map((s) => {
                  const sottotag = String(s.tag_dettaglio_id);
                  return (
                    <li key={sottotag}>
                      {voce(s.tag_dettaglio_descrizione, filtri.sottotag.includes(sottotag),
                        filtroConSottotag(filtri, c, sottotag), { chiudi: false })}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function VoceNotizia({ notizia }) {
  const sommario = sommarioNotizia(notizia);
  return (
    <Link to={PERCORSI.notizie.dettaglio(notizia.notizia_id)} className={stili.voce}>
      <span className={stili.testataVoce}>
        <span className={stili.pilloleVoce}>
          {notizia.tag_descrizione && <span className={pillola("primario")}>{notizia.tag_descrizione}</span>}
          {(notizia.sottotag ?? []).map((s) => (
            <span key={s.tag_dettaglio_id} className={pillola("neutro")}>{s.tag_dettaglio_descrizione}</span>
          ))}
        </span>
        <span>{dataNotizia(notizia.notizia_created_at)}</span>
      </span>
      <span className={stili.titoloVoce}><PallinoDaLeggere notizia={notizia} />{notizia.notizia_titolo}</span>
      {sommario && <span className={stili.sommarioVoce}>{sommario}</span>}
    </Link>
  );
}
