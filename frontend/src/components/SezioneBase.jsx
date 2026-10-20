import { contenutoPagina, titoloPagina } from "../config/styles/pagina.js";

/** Punto di composizione delle sezioni della prima base. */
export default function SezioneBase({ titolo }) {
  return <section className={contenutoPagina("pagina")} aria-label={titolo}>
    <h1 className={titoloPagina()}>{titolo}</h1>
  </section>;
}
