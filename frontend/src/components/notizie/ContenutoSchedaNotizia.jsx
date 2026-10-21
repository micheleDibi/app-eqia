import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import StatoCaricamentoDettaglio from "../shared/StatoCaricamentoDettaglio.jsx";
import AlertMessage from "../AlertMessage.jsx";
import PaginaNonTrovata from "../PaginaNonTrovata.jsx";
import { ArrowLeft, ExternalLink } from "../../config/icone.js";
import { ROTTE } from "../../config/routes/percorsi.js";
import { collegamentoIndietro, contenutoPagina } from "../../config/styles/pagina.js";
import { STILI_NOTIZIE as stili } from "../../config/styles/notizie.js";
import { TESTI_SCHEDA_NOTIZIA as testi } from "../../config/testi/notizie.js";
import { leggiNotizia, testoGruppi } from "../../lib/notizie.js";
import { aggiornaNotizieDaLeggere } from "../../lib/notizieDaLeggere.js";
import Testata from "./TestataNotizia.jsx";
import AzioniNazionale from "./AzioniNazionaleNotizia.jsx";

export default function Scheda({ notiziaId }) {
  const navigate = useNavigate();
  const avviso = useLocation().state?.avviso ?? null;
  const [stato, setStato] = useState({ scheda: null, loading: true, errore: null });

  useEffect(() => {
    const controllo = new AbortController();
    leggiNotizia(notiziaId, controllo.signal)
      .then((scheda) => {
        setStato({ scheda, loading: false, errore: null });
        // Aprirla l'ha segnata letta: il numero del menu scende subito.
        aggiornaNotizieDaLeggere();
      })
      .catch((errore) => {
        if (!controllo.signal.aborted) setStato({ scheda: null, loading: false, errore });
      });
    return () => controllo.abort();
  }, [notiziaId]);

  if (stato.errore?.stato === 404) return <PaginaNonTrovata />;
  if (!stato.scheda) return <StatoCaricamentoDettaglio loading={stato.loading} errore={stato.errore} ritorno={ROTTE.notizie} />;
  const scheda = stato.scheda;

  return (
    <div className={contenutoPagina("modulo")}>
      <div className={stili.barraScheda}>
        <Link to={ROTTE.notizie} className={collegamentoIndietro()}>
          <ArrowLeft aria-hidden="true" className="size-2.75" />{testi.indietro}
        </Link>
        {scheda.modificabile && (
          <div className={stili.azioniScheda}>
            <AzioniNazionale scheda={scheda} onEliminata={() => navigate(ROTTE.notizie)} />
          </div>
        )}
      </div>
      {avviso && <AlertMessage message={{ type: "warning", text: avviso }} />}
      <article className={stili.corpo}>
        <Testata scheda={scheda} />
        <div className={stili.contenuto}>
          <p className={stili.testo}>{scheda.notizia_descrizione}</p>
          {scheda.notizia_url && (
            <a href={scheda.notizia_url} target="_blank" rel="noopener noreferrer" className={stili.link}>
              <ExternalLink aria-hidden="true" className="size-4" />{testi.apriLink}
            </a>
          )}
        </div>
        {scheda.modificabile && (
          <p className={stili.piede}>{testi.destinatari(testoGruppi(scheda.gruppi, { tutti: testi.tuttiAttuatori }), scheda.destinatari ?? 0)}</p>
        )}
      </article>
    </div>
  );
}
