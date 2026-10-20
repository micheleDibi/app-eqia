import { useId } from "react";
import { MASSIMO_REGIONI_PAGINA } from "../../config/edunews24.js";
import { STILI_EDUNEWS24, occhiello, titoloVoce } from "../../config/styles/edunews24.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";
import {
  daVerificareBando,
  descriviAreaBando,
  euroSenzaDecimali,
  formattaGiorno,
  statoBando,
  targaBando,
  testoArea,
  testoAreaAccessibile,
} from "../../lib/edunews24.js";
import DistintivoScadenza from "./DistintivoScadenza.jsx";
import LinkEsterno from "./LinkEsterno.jsx";
import MetadatiVoce from "./MetadatiVoce.jsx";
import NotaDaVerificare from "./NotaDaVerificare.jsx";
import Targa from "./Targa.jsx";

/**
 * Riga di un bando nella pagina, sullo scheletro di RigaOpportunita: l'unico
 * link e' il titolo, esteso a tutta la riga (mai role="button").
 *
 * - Colonna di stato: la targa con l'apertura o la scadenza (mai la
 *   pubblicazione, che dice gia' il gruppo), il distintivo di stato ("Apre il
 *   3 nov": la targa non ha etichetta) e "Da verificare".
 * - Corpo: ente su una riga, titolo su 3 righe, la frase "Da verificare" (che
 *   e' anche la descrizione del link), metadati senza la data: tipologia (o
 *   programma), dotazione, area, "Pubblicato dall'ente il ..." e "Fonte".
 * - Area: "Nazionale", "Tutte le regioni" o fino a 3 regioni piu' "+N". Sta
 *   due volte nel DOM, come nella selezione: colonna dai 52rem di pannello,
 *   altrimenti nei metadati.
 */
export default function RigaBando({ voce, adesso }) {
  const idNota = useId();
  const stato = statoBando(voce, adesso);
  const nota = daVerificareBando(voce, adesso);
  const area = descriviAreaBando(voce, MASSIMO_REGIONI_PAGINA);
  const dotazione = euroSenzaDecimali(voce.dotazione_euro);
  const pubblicato = formattaGiorno(voce.pubblicato_dalla_fonte);
  const dettagli = [
    { chiave: "tipologia", testo: voce.tipologia ?? voce.programma ?? "", className: "edunews24-riga__tipologia" },
    { chiave: "dotazione", testo: dotazione ? testi.dotazione(dotazione) : "", className: STILI_EDUNEWS24.cifre },
    {
      chiave: "area",
      testo: testoArea(area),
      sr: testoAreaAccessibile(area),
      className: "edunews24-riga__area-meta",
    },
    { chiave: "pubblicato", testo: pubblicato ? testi.pubblicatoDallaFonte(pubblicato) : "", className: STILI_EDUNEWS24.cifre },
  ];

  return (
    <li className="edunews24-riga edunews24-voce" data-contesto="pagina" data-sezione="bandi">
      <div className="edunews24-riga__stato">
        <Targa forma="adattiva" {...targaBando(voce, stato, adesso)} />
        <DistintivoScadenza stato={stato} />
        <NotaDaVerificare nota={nota} variante="distintivo" />
      </div>
      <div className="edunews24-riga__corpo">
        {voce.ente && <p className={["edunews24-riga__ente", occhiello("ente")].join(" ")}>{voce.ente}</p>}
        <h3 className="edunews24-voce__titolo">
          <LinkEsterno href={voce.url} className="edunews24-voce__link group" descrizione={nota ? idNota : undefined}>
            <span className={titoloVoce("titolo", 3)}>{voce.titolo}</span>
          </LinkEsterno>
        </h3>
        <NotaDaVerificare nota={nota} variante="esteso" id={idNota} />
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
