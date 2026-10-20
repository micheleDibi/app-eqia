import useQueryPagina from "../../hooks/useQueryPagina.js";
import { useSessione } from "../../hooks/useSessione.js";
import { QUERY_PROFILO } from "../../config/routes/query.js";
import BarraSchede from "../shared/BarraSchede.jsx";
import { STILI_PROFILO as stili } from "../../config/styles/profilo.js";
import { SCHEDE_PROFILO, TESTI_PROFILO } from "../../config/testi/profilo.js";
import DatiPrincipaliProfilo from "./DatiPrincipaliProfilo.jsx";
import RiepilogoProfilo from "./RiepilogoProfilo.jsx";
import SicurezzaProfilo from "./SicurezzaProfilo.jsx";

const PANNELLI = {
  "dati-principali": (profilo) => <DatiPrincipaliProfilo profilo={profilo} />,
  utente: (profilo) => <RiepilogoProfilo profilo={profilo} />,
  sicurezza: () => <SicurezzaProfilo />,
};

export default function DettaglioProfilo({ profilo }) {
  const sessione = useSessione();
  const [{ scheda: attiva }, aggiornaQuery] = useQueryPagina(QUERY_PROFILO);
  const setAttiva = scheda => aggiornaQuery({ scheda }, { replace: false });
  // La scheda Sicurezza (secondo fattore) esiste solo per il Nazionale; il
  // server rifiuta comunque gli altri ruoli, qui si evita di mostrarla.
  const visibili = SCHEDE_PROFILO.filter(({ soloNazionale }) => !soloNazionale || sessione?.ruoloCodice === "nazionale");
  const schede = visibili.map(({ id, etichetta }) => ({ id, label: etichetta }));
  const corrente = visibili.some(({ id }) => id === attiva) ? attiva : visibili[0].id;
  return (
    <div className={stili.contenitore}>
      <BarraSchede id="profilo" etichetta={TESTI_PROFILO.titolo} schede={schede}
        attiva={corrente} onChange={setAttiva} />
      {visibili.map(({ id }) => (
        <div key={id} role="tabpanel" id={`profilo-pannello-${id}`} aria-labelledby={`profilo-scheda-${id}`}
          hidden={corrente !== id} tabIndex={0} className={stili.pannello}>
          {corrente === id && PANNELLI[id](profilo)}
        </div>
      ))}
    </div>
  );
}
