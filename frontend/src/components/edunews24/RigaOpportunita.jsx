import { MASSIMO_REGIONI_PAGINA } from "../../config/edunews24.js";
import { STILI_EDUNEWS24, occhiello, titoloVoce } from "../../config/styles/edunews24.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";
import {
  descriviArea,
  giornoRoma,
  partiGiorno,
  statoOpportunita,
  testoArea,
  testoAreaAccessibile,
  tonoTarga,
} from "../../lib/edunews24.js";
import DistintivoScadenza from "./DistintivoScadenza.jsx";
import LinkEsterno from "./LinkEsterno.jsx";
import MetadatiVoce from "./MetadatiVoce.jsx";
import Targa from "./Targa.jsx";

// Una classe di concorso piu' lunga di cosi' non sta nella cifra della
// colonna (6rem): si mostra come etichetta, che va a capo.
const CIFRA_CLASSE_MASSIMA = 5;

// Targa della selezione: la scadenza ("15 ott", con l'anno solo se diverso da
// quello in corso), "Senza scadenza" se manca; il tono segue il distintivo.
function targaScadenza(voce, stato, adesso) {
  const tono = tonoTarga(stato);
  const scadenza = partiGiorno(voce.scadenza);
  if (!scadenza) return { tono, etichetta: testi.senzaScadenza, sr: testi.scadenzaNonIndicata };
  const annoInCorso = giornoRoma(adesso)?.slice(0, 4);
  return {
    tono,
    cifra: scadenza.giorno,
    mese: scadenza.mese,
    anno: scadenza.anno === annoInCorso ? undefined : scadenza.anno,
    sr: testi.scadenzaSr(scadenza.esteso),
  };
}

// Targa bordata della classe di concorso degli interpelli.
function targaClasse(classe) {
  const breve = classe.length <= CIFRA_CLASSE_MASSIMA;
  return { cifra: breve ? classe : undefined, etichetta: breve ? undefined : classe, sr: testi.classeSr(classe) };
}

/**
 * Riga di Interpelli e Selezione nella pagina: l'unico link e' il titolo,
 * esteso a tutta la riga (mai role="button").
 *
 * - Colonna di stato: per la selezione la targa della scadenza e il
 *   distintivo; per gli interpelli la targa della classe di concorso, oppure
 *   la cella vuota.
 * - Corpo: ente su una riga, titolo su 3 righe, metadati senza la data (la
 *   dice gia' il gruppo): sede per gli interpelli, figura e posti per la
 *   selezione, poi "Fonte: EduNews24".
 * - Area: "Nazionale" o fino a 3 regioni piu' "+N". Sta due volte nel DOM,
 *   come colonna e nei metadati: il CSS ne mostra una sola secondo la
 *   larghezza del pannello.
 */
export default function RigaOpportunita({ voce, sezione, adesso }) {
  const selezione = voce.tipo === "selezione-personale";
  const stato = statoOpportunita(voce, adesso);
  const classe = voce.tipo === "interpello" ? voce.classe_concorso : null;
  const area = descriviArea(voce, MASSIMO_REGIONI_PAGINA);
  const areaMeta = {
    chiave: "area",
    testo: testoArea(area),
    sr: testoAreaAccessibile(area),
    className: "edunews24-riga__area-meta",
  };
  const dettagli = selezione
    ? [
        areaMeta,
        { chiave: "figura", testo: voce.figura ? testi.figura(voce.figura) : "" },
        { chiave: "posti", testo: voce.posti ? testi.posti(voce.posti) : "" },
      ]
    : [{ chiave: "sede", testo: voce.sede ?? "" }, areaMeta];

  return (
    <li className="edunews24-riga edunews24-voce" data-contesto="pagina" data-sezione={sezione}>
      <div className="edunews24-riga__stato">
        {selezione && (
          <>
            <Targa forma="adattiva" {...targaScadenza(voce, stato, adesso)} />
            <DistintivoScadenza stato={stato} />
          </>
        )}
        {classe && <Targa forma="adattiva" {...targaClasse(classe)} />}
      </div>
      <div className="edunews24-riga__corpo">
        {voce.ente && <p className={["edunews24-riga__ente", occhiello("ente")].join(" ")}>{voce.ente}</p>}
        <h3 className="edunews24-voce__titolo">
          <LinkEsterno href={voce.url} className="edunews24-voce__link group">
            <span className={titoloVoce("titolo", 3)}>{voce.titolo}</span>
          </LinkEsterno>
        </h3>
        <MetadatiVoce voce={voce} adesso={adesso} conData={false} dettagli={dettagli} />
      </div>
      <div className="edunews24-riga__area">
        {area && (
          <p className={STILI_EDUNEWS24.area}>
            <span aria-hidden="true">{testoArea(area)}</span>
            <span className="sr-only">{testoAreaAccessibile(area)}</span>
          </p>
        )}
      </div>
    </li>
  );
}
