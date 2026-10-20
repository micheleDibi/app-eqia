import { VOCI_BANDI_MODULO } from "../../config/edunews24.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";

// Forme statiche nei neutri ERSAF, sulle stesse classi del contenuto vero:
// ricalcano misure e griglie senza alcuna animazione. Il tabellone dei bandi
// ha una riga in meno, come quello vero (VOCI_BANDI_MODULO, voce principale
// compresa).
const MINIATURE = [0, 1, 2, 3];
const RIGHE_TABELLONE = [0, 1, 2];
const RIGHE_TABELLONE_BANDI = RIGHE_TABELLONE.slice(0, VOCI_BANDI_MODULO - 1);
const SECONDARI = [0, 1];
const RIGHE_PAGINA = [0, 1, 2, 3, 4];

function Barra({ forma }) {
  return <span className="edunews24-scheletro__barra" data-forma={forma} />;
}

function Titolo({ righe = 3 }) {
  return (
    <span className="edunews24-scheletro__righe">
      <Barra forma="titolo" />
      <Barra forma="titolo" />
      {righe > 2 && <Barra forma="titolo" />}
    </span>
  );
}

function Media({ misura }) {
  const media = <div className="edunews24-media"><div className="edunews24-media__quadro" /></div>;
  return misura ? <div className="edunews24-cornice" data-misura={misura}>{media}</div> : media;
}

function Apertura({ className = "" }) {
  return (
    <div className={["edunews24-apertura", className].filter(Boolean).join(" ")}>
      <div className="edunews24-apertura__media"><Media misura="grande" /></div>
      <div className="edunews24-apertura__testo">
        <Barra forma="occhiello" />
        <Titolo />
        <Barra forma="meta" />
      </div>
    </div>
  );
}

function VoceNotizia({ forma, className = "" }) {
  return (
    <div className={["edunews24-voce", className].filter(Boolean).join(" ")} data-forma={forma}>
      <Media />
      <div className="edunews24-voce__testo">
        <Barra forma="occhiello" />
        <Titolo />
        <Barra forma="meta" />
      </div>
    </div>
  );
}

function ModuloNotizie() {
  return (
    <>
      <Apertura />
      <ul className="edunews24-fascia">
        {MINIATURE.map((indice) => (
          <li key={indice}>
            <div className="edunews24-miniatura">
              <Media misura="piccola" />
              <span className="edunews24-miniatura__occhiello"><Barra forma="occhiello" /></span>
              <span className="edunews24-miniatura__titolo"><Titolo righe={2} /></span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function ModuloOpportunita({ sezione }) {
  const righe = sezione === "bandi" ? RIGHE_TABELLONE_BANDI : RIGHE_TABELLONE;
  return (
    <>
      <div className="edunews24-principale">
        <span className="edunews24-timbro" />
        <div className="edunews24-principale__corpo">
          <Barra forma="occhiello" />
          <Titolo />
          <Barra forma="meta" />
        </div>
      </div>
      <div className="edunews24-tabellone">
        <ul className="edunews24-tabellone__elenco">
          {righe.map((indice) => (
            <li key={indice} className="edunews24-riga" data-contesto="modulo">
              <span className="edunews24-targa" data-forma="riga" />
              <span className="edunews24-riga__corpo"><Titolo righe={2} /></span>
              <span className="edunews24-riga__luogo"><Barra forma="meta" /></span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function PaginaNotizie() {
  return (
    <>
      <div className="edunews24-prima-pagina">
        <Apertura className="edunews24-prima-pagina__apertura" />
        <div className="edunews24-prima-pagina__secondari">
          {SECONDARI.map((indice) => <VoceNotizia key={indice} forma="compatta" className="edunews24-secondario" />)}
        </div>
      </div>
      <div className="edunews24-griglia">
        <span className="edunews24-griglia__titolo"><Barra forma="gruppo" /></span>
        <div className="edunews24-banda" data-schema="coppia">
          <VoceNotizia forma="scheda" />
          <VoceNotizia forma="compatta" />
        </div>
      </div>
    </>
  );
}

function PaginaOpportunita({ sezione }) {
  return (
    <div className="edunews24-gruppo">
      <div className="edunews24-gruppo__intestazione"><Barra forma="gruppo" /></div>
      <ul className="edunews24-elenco">
        {RIGHE_PAGINA.map((indice) => (
          <li key={indice} className="edunews24-riga" data-contesto="pagina" data-sezione={sezione}>
            <div className="edunews24-riga__stato"><span className="edunews24-targa" data-forma="adattiva" /></div>
            <div className="edunews24-riga__corpo">
              <Barra forma="occhiello" />
              <Titolo righe={2} />
              <Barra forma="meta" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Scheletro del primo caricamento, nel modulo (`contesto="modulo"`) o nella
 * pagina, per la sezione indicata: notizie con apertura e fascia (o prima
 * pagina e una banda), opportunita' e bandi con timbro e tabellone (o righe
 * con la targa). Statico; le forme sono nascoste ai lettori di schermo, che sentono
 * solo il testo in role="status". Niente aria-busy qui: su un antenato del
 * role="status" permetterebbe ai lettori di schermo di tacerlo.
 */
export default function ScheletroEduNews24({ contesto = "modulo", sezione = "notizie" }) {
  const pagina = contesto === "pagina";
  const notizie = sezione === "notizie";
  return (
    <div className="edunews24-scheletro" data-contesto={pagina ? "pagina" : "modulo"}>
      <div className="edunews24-scheletro__forme" aria-hidden="true">
        {pagina && notizie && <PaginaNotizie />}
        {pagina && !notizie && <PaginaOpportunita sezione={sezione} />}
        {!pagina && notizie && <ModuloNotizie />}
        {!pagina && !notizie && <ModuloOpportunita sezione={sezione} />}
      </div>
      <p className="sr-only" role="status">{testi.caricamento[sezione] ?? testi.caricamento.notizie}</p>
    </div>
  );
}
