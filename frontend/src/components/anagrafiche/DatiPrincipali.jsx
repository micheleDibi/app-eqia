import { TESTI_ANAGRAFICA } from "../../config/testi/anagrafica.js";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import CampoModulo from "../shared/CampoModulo.jsx";
import ContattiAnagrafica from "./ContattiAnagrafica.jsx";
import InformazioniPersonali from "./InformazioniPersonali.jsx";
import DocumentoAnagrafica from "./DocumentoAnagrafica.jsx";
import ResidenzaDomicilio from "./ResidenzaDomicilio.jsx";
import SceltaRuolo from "./SceltaRuolo.jsx";
import CollegamentiSottoscrittore from "./CollegamentiSottoscrittore.jsx";

/**
 * Scheda Anagrafica: dati della persona, ruolo (solo attuatori), contatti
 * con la verifica di email e cellulare, documento, residenza e domicilio.
 *
 * @param {{
 *   tipo: "sottoscrittore"|"attuatore",
 *   clienteId: number,
 *   dati: object,
 *   onCambia: Function,
 *   onCopiaResidenza: Function,
 *   ruoli: number[],
 *   onStatoAccount: Function,
 * }} props
 */
export default function DatiPrincipali({
  tipo, clienteId, dati, onCambia, onCopiaResidenza, ruoli, onStatoAccount, onScegliRelazione,
}) {
  return (
    <div>
      <InformazioniPersonali dati={dati} onCambia={onCambia} tipo={tipo} />
      {tipo === "sottoscrittore" && <CollegamentiSottoscrittore dati={dati} onScegli={onScegliRelazione} />}

      {tipo === "attuatore" && (
        <SezioneModulo titolo={TESTI_ANAGRAFICA.ruolo.titolo} descrizione={TESTI_ANAGRAFICA.ruolo.descrizione}>
          <CampoModulo per="ruolo-attuatore" etichetta={TESTI_ANAGRAFICA.ruolo.etichetta} colonne={3}>
            <SceltaRuolo id="ruolo-attuatore" valore={dati.ruolo} ruoli={ruoli} onCambia={onCambia} soloAttuatori />
          </CampoModulo>
        </SezioneModulo>
      )}

      <ContattiAnagrafica clienteId={clienteId} dati={dati} onCambia={onCambia}
        onStato={onStatoAccount} />
      <DocumentoAnagrafica dati={dati} onCambia={onCambia} />
      <ResidenzaDomicilio dati={dati} onCambia={onCambia} onCopiaResidenza={onCopiaResidenza} />
    </div>
  );
}
