import { useEffect, useId, useRef } from "react";
import { AREA_NAZIONALE, REGIONI_EDUNEWS24 } from "../../config/edunews24.js";
import { Video } from "../../config/icone.js";
import { interruttore, levettaInterruttore } from "../../config/styles/anagrafica.js";
import { campo } from "../../config/styles/campo.js";
import { STILI_EDUNEWS24 } from "../../config/styles/edunews24.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";
import { areeAmmesse, filtriAttivi, osservaAltezzaFiltri } from "../../lib/edunews24.js";
import FiltriAttiviEduNews24 from "./FiltriAttiviEduNews24.jsx";

// Linguette di scheletro finche' le categorie non arrivano.
const LINGUETTE_SCHELETRO = [0, 1, 2];
// Spazio attorno alla linguetta per l'anello di focus: 2px di outline e 2px
// di offset (regola 1 di styles/edunews24.css).
const MARGINE_ANELLO = 4;

// Porta una linguetta per intero in vista nella fila che scorre, anello
// compreso. Solo in orizzontale: scrollIntoView muoverebbe anche la pagina,
// per via dello scroll-padding che lascia spazio alla barra stessa. Con una
// linguetta piu' larga della fila vince l'inizio. Arrotondato per eccesso:
// lo scorrimento a pixel interi non deve lasciare fuori una frazione
// dell'anello (e il browser, trovandola, centrerebbe la linguetta).
function portaInVista(fila, linguetta) {
  const spazio = fila.getBoundingClientRect();
  const posizione = linguetta.getBoundingClientRect();
  const aSinistra = posizione.left - MARGINE_ANELLO - spazio.left;
  const aDestra = posizione.right + MARGINE_ANELLO - spazio.right;
  if (aSinistra < 0) fila.scrollLeft += Math.floor(aSinistra);
  else if (aDestra > 0) fila.scrollLeft += Math.ceil(aDestra);
}

// Controllo della barra che riceve il fuoco dopo la rimozione di un filtro:
// quello del filtro (data-controllo), altrimenti il primo della barra.
function controllo(radice, chiave) {
  if (!radice) return null;
  return radice.querySelector(`[data-controllo="${chiave}"]`) ?? radice.querySelector("button, select");
}

/**
 * Barra dei filtri di una scheda della pagina, che resta in vista mentre si
 * scorre (sticky nel CSS) ed e' usabile anche durante il primo caricamento.
 *
 * - Notizie: le categorie come linguette aria-pressed in una fila che scorre
 *   ("Tutte" per prima, poi l'ordine dell'API; tre linguette di scheletro
 *   finche' non arrivano, nessuna fila se falliscono) e l'interruttore "Solo
 *   video" fuori dallo scorrimento.
 * - Interpelli, Selezione e Bandi: "Area" con il select nativo; "Nazionale"
 *   dove areeAmmesse lo ammette (selezione e bandi), le 20 regioni in ordine
 *   alfabetico.
 * - Con filtri attivi, la seconda riga con le etichette rimovibili (sotto i
 *   40rem di foglio una riga sola che scorre; per Interpelli e Selezione, dai
 *   52rem, accanto alla select se c'e' spazio).
 *
 * `rif` e' il ref della radice: il pannello lo usa per riportare il fuoco al
 * primo controllo dopo "Rimuovi filtri". Rimuovendo un solo filtro il fuoco
 * va al suo controllo prima che l'etichetta sparisca. `descrizioneArea`: id
 * del testo che spiega la select (la nota sull'area dei bandi), altrimenti
 * undefined.
 */
export default function BarraFiltriEduNews24({
  rif,
  sezione,
  filtri,
  categorie,
  descrizioneArea,
  onFiltro,
  onRimuoviFiltri,
}) {
  const idArea = useId();
  const rifCategorie = useRef(null);
  const notizie = sezione === "notizie";
  const attivi = filtriAttivi(sezione, filtri, categorie.categorie);
  const video = filtri.video === "1";

  // Lo scroll-padding della pagina segue l'altezza reale della barra.
  useEffect(() => osservaAltezzaFiltri(rif.current), [rif]);

  // La categoria attiva resta in vista nella fila che scorre.
  useEffect(() => {
    const fila = rifCategorie.current;
    const attiva = fila?.querySelector('[aria-pressed="true"]');
    if (attiva) portaInVista(fila, attiva);
  }, [filtri.categoria, categorie.stato]);

  // Con la tastiera anche la linguetta a fuoco entra per intero, anello
  // compreso: il browser scorre la fila solo se e' del tutto fuori vista. Non
  // al clic: la fila scorrerebbe fra la pressione e il rilascio del puntatore
  // e il clic finirebbe su un'altra linguetta. Vale anche per la riga dei
  // filtri attivi, che sotto i 40rem di foglio scorre allo stesso modo.
  function fuocoNellaFila(evento) {
    if (evento.target.matches(":focus-visible")) portaInVista(evento.currentTarget, evento.target);
  }

  function rimuovi(chiave) {
    controllo(rif.current, chiave)?.focus();
    onFiltro({ [chiave]: "" });
  }

  return (
    <div ref={rif} className="edunews24-filtri">
      <div className="edunews24-filtri__riga">
        {notizie && categorie.stato !== "errore" && (
          <div ref={rifCategorie} role="group" aria-label={testi.categorie} className="edunews24-filtri__categorie"
            onFocus={fuocoNellaFila}>
            <button type="button" className="edunews24-linguetta" aria-pressed={filtri.categoria === ""}
              data-controllo="categoria" onClick={() => onFiltro({ categoria: "" })}>
              {testi.tutteLeCategorie}
            </button>
            {categorie.stato === "attesa"
              ? LINGUETTE_SCHELETRO.map((indice) => (
                  <span key={indice} className="edunews24-filtri__attesa" aria-hidden="true" />
                ))
              : categorie.categorie.map(({ slug, nome }) => (
                  <button key={slug} type="button" className="edunews24-linguetta"
                    aria-pressed={filtri.categoria === slug} onClick={() => onFiltro({ categoria: slug })}>
                    {nome}
                  </button>
                ))}
          </div>
        )}
        {notizie && (
          <label className="edunews24-filtri__video">
            <Video aria-hidden="true" className={STILI_EDUNEWS24.iconaPiccola} />
            <span className={STILI_EDUNEWS24.etichettaControllo}>{testi.soloVideo}</span>
            <button type="button" role="switch" aria-checked={video} data-controllo="video"
              className={interruttore(video)} onClick={() => onFiltro({ video: video ? "" : "1" })}>
              <span aria-hidden="true" className={levettaInterruttore(video)} />
            </button>
          </label>
        )}
        {!notizie && (
          <div className="edunews24-filtri__area">
            <label htmlFor={idArea} className={STILI_EDUNEWS24.etichettaControllo}>{testi.area}</label>
            <select id={idArea} className={campo("compatto")} value={filtri.area} data-controllo="area"
              aria-describedby={descrizioneArea} onChange={(evento) => onFiltro({ area: evento.target.value })}>
              <option value="" data-senza-filtro>{testi.tutteLeAree}</option>
              {areeAmmesse(sezione).includes(AREA_NAZIONALE) && (
                <optgroup label={testi.tuttaItalia}>
                  <option value={AREA_NAZIONALE}>{testi.nazionale}</option>
                </optgroup>
              )}
              <optgroup label={testi.regioni}>
                {REGIONI_EDUNEWS24.map(({ slug, nome }) => <option key={slug} value={slug}>{nome}</option>)}
              </optgroup>
            </select>
          </div>
        )}
      </div>
      {attivi.length > 0 && (
        <FiltriAttiviEduNews24 attivi={attivi} onRimuovi={rimuovi} onRimuoviTutti={onRimuoviFiltri}
          onFocus={fuocoNellaFila} />
      )}
    </div>
  );
}
