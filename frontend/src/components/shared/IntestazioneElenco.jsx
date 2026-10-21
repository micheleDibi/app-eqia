import { useRef } from "react";
import { useTestataElenco } from "../../hooks/useTestataElenco.js";
import FiltriElenco from "./FiltriElenco.jsx";

/** Titolo, ricerca e azioni restano gli stessi nodi anche durante l'aggancio.
 * Il conteggio sta accanto al titolo, fuori dall'h1: il titolo della pagina
 * resta il nome dell'elenco anche mentre il numero cambia.
 * La legenda, facoltativa, si nasconde quando la testata e' agganciata.
 * Il selettore, facoltativo, sta sotto il titolo nella testata estesa e,
 * rimpicciolito, accanto al titolo in quella agganciata (testataElenco.css). */
export default function IntestazioneElenco({ titolo, conteggio, azioni, ricerca, filtri, legenda, selettore }) {
  const soglia = useRef(null);
  const testata = useRef(null);
  useTestataElenco(soglia, testata);
  return (
    <>
      <div ref={soglia} className="soglia-testata-elenco" aria-hidden="true" />
      <div ref={testata} className="testata-elenco">
        <header className="testata-elenco__contenuto" aria-label={titolo}
          data-filtri={Boolean(filtri)} data-selettore={Boolean(selettore)}>
          <div className="testata-elenco__titolo">
            <h1 className="testata-elenco__nome">{titolo}</h1>
            {conteggio && <span className="testata-elenco__conteggio">{conteggio}</span>}
          </div>
          {selettore && <div className="testata-elenco__selettore">{selettore}</div>}
          <search className="testata-elenco__strumenti" aria-label={titolo}>
            <div className="testata-elenco__ricerca">{ricerca}</div>
            {filtri && <FiltriElenco {...filtri} />}
          </search>
          <div className="testata-elenco__azioni">{azioni}</div>
          {legenda && <div className="testata-elenco__legenda">{legenda}</div>}
        </header>
      </div>
    </>
  );
}
