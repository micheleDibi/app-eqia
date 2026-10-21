import { useEffect, useId, useState } from "react";
import { Link } from "react-router";
import PallinoDaLeggere from "./PallinoDaLeggere.jsx";
import { Megaphone } from "../../config/icone.js";
import { PERCORSI, ROTTE } from "../../config/routes/percorsi.js";
import { vociMenuPerRuolo } from "../../config/routes/rotte.js";
import { pillola } from "../../config/styles/pillola.js";
import { STILI_NOTIZIE as stili } from "../../config/styles/notizie.js";
import { TESTI_MODULO_NOTIZIE_DASHBOARD as testi } from "../../config/testi/notizie.js";
import { NOTIZIE_DASHBOARD, dataNotizia, leggiNotizie, notizieDashboard, sommarioNotizia } from "../../lib/notizie.js";

/**
 * Riquadro "Notizie dal Nazionale" per la Dashboard, autosufficiente: fino a
 * tre degli ultimi 30 giorni, altrimenti la sola piu' recente
 * (notizieDashboard). Non disegna nulla finche' le notizie non arrivano, se
 * non ce ne sono o se la lettura non riesce. Chi non ha la voce Notizie nel
 * menu non le chiede. La Dashboard di Equia e' ancora vuota: il riquadro e'
 * pronto da montare li'.
 *
 * @param {{ ruolo?: string }} props  ruolo della sessione
 */
export default function RiquadroNotizie({ ruolo }) {
  const id = useId();
  const [notizie, setNotizie] = useState([]);
  const ammesso = vociMenuPerRuolo(ruolo).some((voce) => voce.rotta === ROTTE.notizie);

  useEffect(() => {
    if (!ammesso) return undefined;
    const controllo = new AbortController();
    leggiNotizie({ limite: NOTIZIE_DASHBOARD, signal: controllo.signal })
      .then((righe) => { if (!controllo.signal.aborted) setNotizie(notizieDashboard(righe)); })
      .catch(() => {});
    return () => controllo.abort();
  }, [ammesso]);

  if (!ammesso || notizie.length === 0) return null;
  return (
    <section aria-labelledby={`${id}-titolo`}>
      <div className={stili.riquadro}>
        <div className={stili.testataRiquadro}>
          <h2 id={`${id}-titolo`} className={stili.titoloRiquadro}>
            <Megaphone aria-hidden="true" className={stili.iconaRiquadro} />{testi.titolo}
          </h2>
          <Link to={ROTTE.notizie} className={stili.tutte}>{testi.tutte}</Link>
        </div>
        <ul role="list" className={stili.vociRiquadro}>
          {notizie.map((notizia) => {
            const sommario = sommarioNotizia(notizia);
            return (
              <li key={notizia.notizia_id}>
                <Link to={PERCORSI.notizie.dettaglio(notizia.notizia_id)} className={stili.voceRiquadro}>
                  <span className={stili.testataVoce}>
                    {notizia.tag_descrizione && <span className={pillola("primario")}>{notizia.tag_descrizione}</span>}
                    <span>{dataNotizia(notizia.notizia_created_at)}</span>
                  </span>
                  <span className={stili.titoloVoce}><PallinoDaLeggere notizia={notizia} />{notizia.notizia_titolo}</span>
                  {sommario && <span className={stili.sommarioVoce}>{sommario}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
