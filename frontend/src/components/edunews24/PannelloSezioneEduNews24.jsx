import { useEffect, useId, useRef } from "react";
import { AREA_NAZIONALE } from "../../config/edunews24.js";
import { STILI_EDUNEWS24, azioneRimuoviFiltri, azioneRiprova } from "../../config/styles/edunews24.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";
import AlertMessage from "../AlertMessage.jsx";
import StatoPagineElenco from "../shared/StatoPagineElenco.jsx";
import BarraFiltriEduNews24 from "./BarraFiltriEduNews24.jsx";
import NotiziePagina from "./NotiziePagina.jsx";
import OpportunitaPagina from "./OpportunitaPagina.jsx";
import RiquadroBandoFit from "./RiquadroBandoFit.jsx";
import ScheletroEduNews24 from "./ScheletroEduNews24.jsx";
import StatoVuotoEduNews24 from "./StatoVuotoEduNews24.jsx";

/**
 * Tabpanel di una scheda della pagina EduNews24, sul modello di
 * DettaglioProfilo: solo quello della scheda attiva ha un contenuto. Niente
 * overflow sul pannello ne' sui suoi antenati, altrimenti la barra dei filtri
 * non resta in vista.
 *
 * Dentro: la barra dei filtri, `.edunews24-pannello` con avvisi, scheletro,
 * vuoto o elenchi, poi StatoPagineElenco (invariato) solo dopo la prima
 * pagina, per "Carica altri" e i suoi errori. Nella scheda Bandi il primo
 * figlio di `.edunews24-pannello`, in ogni stato e fuori dalla barra che
 * resta in vista, e' la nota sull'area (con "Nazionale" quella sui bandi
 * nazionali), che e' anche la descrizione della select dell'area; subito
 * dopo, sempre in ogni stato, il riquadro BandoFit.
 *
 * - Primo caricamento: scheletro della scheda; se fallisce, AlertMessage con
 *   "Riprova" in aria-disabled fino a Retry-After, oppure "Rimuovi filtri"
 *   per un filtro non piu' valido. Come nel modulo, i secondi stanno in una
 *   nota accanto a "Riprova" che sparisce allo sblocco: il testo dell'avviso
 *   resta fermo. Un 401 non mostra nulla.
 * - Primo 409 (elenco cambiato mentre lo si scorreva): la ripartenza e'
 *   automatica; un AlertMessage informativo lo dice e il fuoco torna sul
 *   pannello, che lo ha come descrizione: nasce insieme allo spostamento del
 *   fuoco, e da solo un lettore di schermo direbbe solo il nome del pannello.
 * - Prima pagina senza voci ma con un seguito: una riga dice di caricare le
 *   successive, sopra "Carica altri".
 * - `annuncia`: dopo un cambio di filtro chiesto dall'utente, un testo
 *   nascosto dice "Elenco aggiornato", "Nessuna voce trovata" o la riga qui
 *   sopra.
 *
 * `pagina` e' il risultato di usePaginaEduNews24, chiamato dalla pagina.
 */
export default function PannelloSezioneEduNews24({
  sezione,
  attivo,
  filtri,
  categorie,
  pagina,
  annuncia = false,
  onFiltro,
  onRimuoviFiltri,
}) {
  const idNota = useId();
  const idRipartito = useId();
  const idNotaArea = useId();
  const rifPannello = useRef(null);
  const rifFiltri = useRef(null);
  const ripartito = attivo && pagina.ripartito;

  // Dopo la ripartenza per il 409 le voci che si stavano leggendo spariscono:
  // il fuoco torna in cima al pannello.
  useEffect(() => {
    if (ripartito) rifPannello.current?.focus();
  }, [ripartito]);

  const idPannello = `edunews24-pannello-${sezione}`;
  const idScheda = `edunews24-scheda-${sezione}`;
  if (!attivo) {
    return <div role="tabpanel" id={idPannello} aria-labelledby={idScheda} hidden tabIndex={0} className="schede__pannello" />;
  }

  // Il fuoco va al primo controllo della barra prima che il controllo
  // premuto sparisca.
  function rimuoviFiltri() {
    rifFiltri.current?.querySelector("button, select")?.focus();
    onRimuoviFiltri();
  }

  function riprova() {
    if (pagina.bloccato) return;
    rifPannello.current?.focus();
    pagina.carica();
  }

  const bandi = sezione === "bandi";
  const errore = pagina.errorePrimaPagina;
  const vuoto = pagina.primaCaricata && pagina.elementi.length === 0 && !pagina.altri;
  // Pagine a monte vuote ma con un seguito (voci tutte scartate): nessuna
  // voce ancora, "Carica altri" resta e una riga lo spiega. Il cursore non si
  // segue da solo, per non ripetere le chiamate in ciclo.
  const senzaVoci = pagina.primaCaricata && pagina.elementi.length === 0 && pagina.altri;
  const annuncio = annuncia && pagina.primaCaricata
    ? (vuoto ? testi.annunci.vuoto : senzaVoci ? testi.vociSuccessive : testi.annunci.aggiornato)
    : "";

  let contenuto;
  if (!pagina.primaCaricata && errore) {
    contenuto = (
      <>
        <AlertMessage message={{ type: "error", text: errore.testo }} separato={false} />
        <div className="edunews24-azioni">
          {errore.azione === "rimuovi-filtri" ? (
            <button type="button" className={azioneRimuoviFiltri()} onClick={rimuoviFiltri}>{testi.rimuoviFiltri}</button>
          ) : (
            <>
              <button type="button" className={azioneRiprova()} aria-disabled={pagina.bloccato}
                aria-describedby={errore.nota ? idNota : undefined} onClick={riprova}>
                {testi.riprova}
              </button>
              {errore.nota && <p id={idNota} className={STILI_EDUNEWS24.notaStato}>{errore.nota}</p>}
            </>
          )}
        </div>
      </>
    );
  } else if (!pagina.primaCaricata) {
    contenuto = <ScheletroEduNews24 contesto="pagina" sezione={sezione} />;
  } else if (vuoto && !pagina.errore) {
    contenuto = <StatoVuotoEduNews24 sezione={sezione} filtri={filtri} onRimuoviFiltri={rimuoviFiltri} />;
  } else if (senzaVoci) {
    contenuto = <p className={STILI_EDUNEWS24.rigaStato}>{testi.vociSuccessive}</p>;
  } else if (sezione === "notizie") {
    contenuto = <NotiziePagina voci={pagina.elementi} lunghezzePagine={pagina.lunghezzePagine} adesso={pagina.adesso} />;
  } else {
    contenuto = <OpportunitaPagina sezione={sezione} voci={pagina.elementi} adesso={pagina.adesso} />;
  }

  return (
    <div ref={rifPannello} role="tabpanel" id={idPannello} aria-labelledby={idScheda} tabIndex={0}
      aria-describedby={pagina.ripartito ? idRipartito : undefined} className="schede__pannello">
      <BarraFiltriEduNews24 rif={rifFiltri} sezione={sezione} filtri={filtri} categorie={categorie}
        descrizioneArea={bandi ? idNotaArea : undefined} onFiltro={onFiltro} onRimuoviFiltri={rimuoviFiltri} />
      <div className="edunews24-pannello">
        {bandi && (
          <p id={idNotaArea} className={["edunews24-pannello__nota", STILI_EDUNEWS24.notaArea].join(" ")}>
            {filtri.area === AREA_NAZIONALE ? testi.notaNazionaleBandi : testi.notaAreaBandi}
          </p>
        )}
        {bandi && (
          <div className="edunews24-pannello__supporto">
            <RiquadroBandoFit />
          </div>
        )}
        {pagina.ripartito && <AlertMessage id={idRipartito} message={{ type: "info", text: testi.ripartito }} />}
        {contenuto}
      </div>
      {pagina.primaCaricata && !(vuoto && !pagina.errore) && (
        <StatoPagineElenco pagina={{
          elementi: pagina.elementi,
          altri: pagina.altri,
          loading: pagina.loading,
          errore: pagina.errore,
          carica: pagina.carica,
        }} />
      )}
      <p className="sr-only" role="status">{annuncio}</p>
    </div>
  );
}
