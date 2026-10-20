import { useState } from "react";
import { SEZIONI_EDUNEWS24 } from "../../config/edunews24.js";
import { QUERY_EDUNEWS24 } from "../../config/routes/query.js";
import { foglio } from "../../config/styles/edunews24.js";
import { contenutoPagina } from "../../config/styles/pagina.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";
import { useCategorieEduNews24 } from "../../hooks/useCategorieEduNews24.js";
import { useComparsaRitardata } from "../../hooks/useComparsaRitardata.js";
import { useEsitoFunzioneEduNews24 } from "../../hooks/useEsitoFunzioneEduNews24.js";
import { usePaginaEduNews24 } from "../../hooks/usePaginaEduNews24.js";
import useQueryPagina from "../../hooks/useQueryPagina.js";
import { azzeramentoFiltri, filtriAmmessi, modificheCambioScheda, percorsoSezione } from "../../lib/edunews24.js";
import { leggiEsitoFunzione } from "../../lib/edunews24Api.js";
import BarraSchede from "../shared/BarraSchede.jsx";
import IntestazionePagina from "../shared/IntestazionePagina.jsx";
import PannelloSezioneEduNews24 from "./PannelloSezioneEduNews24.jsx";
import StatoDisattivataEduNews24 from "./StatoDisattivataEduNews24.jsx";
import TestataEduNews24 from "./TestataEduNews24.jsx";

const SCHEDE = SEZIONI_EDUNEWS24.map((sezione) => ({ id: sezione, label: testi.sezioni[sezione] }));

/**
 * Pagina /edunews24: intestazione ERSAF con il titolo testuale, poi il
 * foglio con la testata EduNews24 (unico punto con il logo), le quattro
 * schede Notizie, Interpelli, Selezione personale e Bandi legate a ?scheda= e
 * un pannello per scheda.
 *
 * - Query: scheda e filtri da QUERY_EDUNEWS24. Una combinazione non ammessa
 *   dalla scheda vale "tutte" senza riscrivere l'URL; cambiando scheda si
 *   tolgono i filtri che la nuova non ammette (modificheCambioScheda).
 * - L'elenco a cursore si chiede qui (usePaginaEduNews24), cosi' parte al
 *   montaggio; le categorie solo sulle Notizie, una volta per pagina (dopo un
 *   errore, di nuovo a un cambio di filtro o di scheda, o quando arriva la
 *   prima pagina dell'elenco).
 * - Funzione spenta (esito gia' noto o prima risposta): testata senza folio e
 *   stato neutro, senza schede. Finche' l'esito e' ignoto le schede compaiono
 *   solo dopo un breve ritardo, cosi' a funzione spenta non lampeggiano.
 */
export default function PaginaEduNews24() {
  const [valori, aggiorna] = useQueryPagina(QUERY_EDUNEWS24);
  const sezione = valori.scheda;
  const filtri = filtriAmmessi(sezione, valori);
  const chiave = percorsoSezione(sezione, filtri);
  const funzione = useEsitoFunzioneEduNews24();
  const [esitoIniziale] = useState(leggiEsitoFunzione);
  const [annunciaPer, setAnnunciaPer] = useState(null);
  const comparsa = useComparsaRitardata("pagina", esitoIniziale === "attiva");
  const accesa = funzione !== "disattivata";
  const pagina = usePaginaEduNews24(sezione, filtri, accesa);
  const categorie = useCategorieEduNews24(sezione === "notizie" && accesa, pagina.primaCaricata ? chiave : null);
  const spenta = !accesa || pagina.disattivata;
  const conSchede = !spenta && (funzione === "attiva" || comparsa);

  function cambiaScheda(nuova) {
    if (nuova === sezione) return;
    aggiorna(modificheCambioScheda(sezione, nuova, valori), { replace: false });
  }

  // Un filtro che non cambia l'elenco non fa nulla; negli altri casi l'esito
  // del nuovo elenco si annuncia quando arriva.
  function cambiaFiltri(modifiche) {
    const prossima = percorsoSezione(sezione, { ...filtri, ...modifiche });
    if (prossima === chiave) return;
    setAnnunciaPer(prossima);
    aggiorna(modifiche);
  }

  return (
    <div className={[contenutoPagina(), "edunews24 edunews24-pagina"].join(" ")}>
      <IntestazionePagina titolo={testi.titoloPagina} />
      <div className={["edunews24-foglio", foglio()].join(" ")}>
        <TestataEduNews24 aggiornatoIl={pagina.aggiornatoIl} stantio={pagina.stantio}
          errore={pagina.errorePrimaPagina?.azione === "riprova"} adesso={pagina.adesso} spenta={spenta} />
        {spenta && <StatoDisattivataEduNews24 />}
        {conSchede && (
          <>
            <BarraSchede id="edunews24" etichetta={testi.etichettaSezioni} schede={SCHEDE} attiva={sezione}
              onChange={cambiaScheda} />
            {SEZIONI_EDUNEWS24.map((voce) => (
              <PannelloSezioneEduNews24 key={voce} sezione={voce} attivo={voce === sezione} filtri={filtri}
                categorie={categorie} pagina={pagina} annuncia={annunciaPer === chiave}
                onFiltro={cambiaFiltri} onRimuoviFiltri={() => cambiaFiltri(azzeramentoFiltri())} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
