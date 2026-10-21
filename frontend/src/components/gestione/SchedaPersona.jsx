import { Link } from "react-router";
import useSchedaGestione from "../../hooks/useSchedaGestione.js";
import useQueryPagina from "../../hooks/useQueryPagina.js";
import useNavigazioneElenco from "../../hooks/useNavigazioneElenco.js";
import { useSessione } from "../../hooks/useSessione.js";
import { useIngresso } from "../../hooks/useIngresso.js";
import { QUERY_ANAGRAFICA } from "../../config/routes/query.js";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";
import { STILI_GESTIONE as stili } from "../../config/styles/gestione.js";
import { contenutoPagina } from "../../config/styles/pagina.js";
import { scheda, barraAzioniModulo } from "../../config/styles/superficie.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { nomePersona } from "../../lib/gestione.js";
import IntestazionePagina from "../shared/IntestazionePagina.jsx";
import BarraSchede from "../shared/BarraSchede.jsx";
import StatoCaricamentoDettaglio from "../shared/StatoCaricamentoDettaglio.jsx";
import PaginaNonTrovata from "../PaginaNonTrovata.jsx";
import AlertMessage from "../AlertMessage.jsx";
import DatiPersona from "./DatiPersona.jsx";
import RelazioniPersona from "./RelazioniPersona.jsx";
import AccountPersona from "./AccountPersona.jsx";

const SCHEDE = [{ id: "dati", label: testi.dati }, { id: "account", label: testi.account }];

export default function SchedaPersona({ id, tipo, percorsi, onCreato }) {
  const form = useSchedaGestione(tipo, id, onCreato);
  const { ruoloCodice } = useSessione();
  const { ritorno } = useNavigazioneElenco(percorsi.elenco);
  const [query, aggiorna] = useQueryPagina(QUERY_ANAGRAFICA);
  const ingresso = useIngresso(query.scheda);
  if (form.errore?.status === 404 || (form.salvati && form.salvati.tipo !== tipo)) return <PaginaNonTrovata />;
  if (form.loading || form.errore) return <StatoCaricamentoDettaglio {...form} ritorno={ritorno} />;
  const bloccato = form.salvataggio || (id && !form.salvati.permessi.modifica);
  return <div className={contenutoPagina("modulo")}>
    <IntestazionePagina titolo={id ? testi[tipo].scheda : testi[tipo].nuovo}
      descrizione={form.salvati ? nomePersona(form.salvati) : undefined} indietro={{ rotta: ritorno, etichetta: testi[tipo].elenco }} />
    <AlertMessage message={form.avviso} />
    <div className={`${scheda()} ${stili.modulo}`}>
      <BarraSchede id="persona" etichetta={testi.schede} schede={SCHEDE} attiva={query.scheda}
        onChange={scheda => aggiorna({ scheda }, { replace: false })} />
      <div ref={ingresso} className="schede__pannello schede__pannello--sezioni movimento-scheda">
        <form id="persona-pannello-dati" onSubmit={form.salva} onInvalidCapture={() => aggiorna({ scheda: "dati" })}
          hidden={query.scheda !== "dati"} role="tabpanel" aria-labelledby="persona-scheda-dati">
          <DatiPersona form={form} disabilitato={bloccato} />
          <RelazioniPersona tipo={tipo} form={form} ruolo={ruoloCodice} disabilitato={bloccato} />
        </form>
        <div hidden={query.scheda !== "account"} role="tabpanel" id="persona-pannello-account" aria-labelledby="persona-scheda-account">
          <AccountPersona id={id} form={form} />
        </div>
      </div>
      <div className={barraAzioniModulo("scheda")}><div className={stili.azioni}>
        <Link to={ritorno} className={pulsante("secondario", "grande")}>{testi.annulla}</Link>
        {query.scheda === "dati" && (!id || form.salvati.permessi.modifica) && <button type="submit" form="persona-pannello-dati"
          disabled={form.salvataggio} className={pulsante("primario", "grande")}>{form.salvataggio ? testi.salvataggio : id ? testi.salva : testi.crea}</button>}
      </div></div>
    </div>
  </div>;
}
