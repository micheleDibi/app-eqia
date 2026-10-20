import { STILI_EDUNEWS24 } from "../../config/styles/edunews24.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";
import { bandeGriglia, chiaveVoce } from "../../lib/edunews24.js";
import AperturaNotizia from "./AperturaNotizia.jsx";
import BandaNotizie from "./BandaNotizie.jsx";
import VoceNotiziaPagina from "./VoceNotiziaPagina.jsx";

/**
 * Notizie della pagina, come una prima pagina: l'apertura grande (player se
 * c'e' il video, titolo completo in h2, sintesi di 3 righe) con 2 secondari
 * accanto, poi "Altre notizie" in bande dal ritmo variato. Apertura e
 * secondari vengono solo dalla prima pagina caricata; con un filtro
 * l'apertura e' il primo risultato filtrato. "Carica altri" accoda bande senza
 * ricreare l'apertura.
 */
export default function NotiziePagina({ voci, lunghezzePagine, adesso }) {
  const { apertura, secondarie, bande } = bandeGriglia(lunghezzePagine, voci);
  return (
    <>
      {apertura && (
        <div className="edunews24-prima-pagina">
          <AperturaNotizia key={chiaveVoce(apertura)} voce={apertura} adesso={adesso} contesto="pagina"
            className="edunews24-prima-pagina__apertura" />
          {secondarie.length > 0 && (
            <div className="edunews24-prima-pagina__secondari">
              {secondarie.map((voce) => (
                <VoceNotiziaPagina key={chiaveVoce(voce)} voce={voce} adesso={adesso} forma="compatta"
                  className="edunews24-secondario" />
              ))}
            </div>
          )}
        </div>
      )}
      {bande.length > 0 && (
        <section className="edunews24-griglia">
          <h2 className={["edunews24-griglia__titolo", STILI_EDUNEWS24.titoloGruppo].join(" ")}>
            {testi.altreNotizie}
          </h2>
          {bande.map((banda) => <BandaNotizie key={banda.chiave} banda={banda} adesso={adesso} />)}
        </section>
      )}
    </>
  );
}
