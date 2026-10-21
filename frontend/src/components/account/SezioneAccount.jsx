import { useState } from "react";
import AlertMessage from "../AlertMessage.jsx";
import DialogoConferma from "../shared/DialogoConferma.jsx";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import DialogoVerifica from "./DialogoVerifica.jsx";
import RecapitoAccount from "./RecapitoAccount.jsx";
import { useAccount } from "../../hooks/useAccount.js";
import { pillola } from "../../config/styles/pillola.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { STILI_ANAGRAFICA as stili } from "../../config/styles/anagrafica.js";
import { TESTI_ACCOUNT as testi } from "../../config/testi/account.js";
import { cambioStato, pillolaStato } from "../../lib/account.js";

/**
 * Sezione account della scheda anagrafica (docs/contratti-account.md):
 * verifica di email e cellulare e stato dell'account. La scheda la monta su
 * un'anagrafica gia' salvata; i valori dei contatti si modificano nella
 * scheda, qui si verificano.
 *
 * @param {{
 *   clienteId: number,
 *   valori?: { email?: string, cellulare?: string },
 *   permessi?: { statoAccount?: boolean },
 * }} props
 *   valori: i contatti come sono a video nella scheda, per dire "Salva le
 *   modifiche" quando sono diversi da quelli salvati; senza, quelli salvati.
 *   permessi.statoAccount: mostra Attiva/Disattiva (solo il Nazionale; il
 *   server lo controlla comunque).
 */
export default function SezioneAccount({ clienteId, valori, permessi = {} }) {
  const account = useAccount(clienteId);
  const [conferma, setConferma] = useState(null);
  const stato = account.stato;
  const valore = (tipo) => valori?.[tipo] ?? stato?.[tipo]?.valore ?? "";
  const verifica = (tipo) => ({
    disponibile: Boolean(clienteId && stato), stato: stato?.[tipo],
    apri: () => account.setSelezionato({ tipo, valore: valore(tipo) }),
  });
  const pillolaAccount = pillolaStato(stato?.attivazione);
  const cambio = stato ? cambioStato(stato.attivazione) : null;

  return (
    <SezioneModulo titolo={testi.titolo} descrizione={testi.descrizione} griglia={false}>
      <div className={stili.colonnaContatti}>
        <div className={stili.messaggiContatti}>
          <AlertMessage message={account.messaggio} separato={false} />
          {stato?.attivazione === "in_attesa" && <p className={stili.messaggioAttivazione}>{testi.attivazione}</p>}
        </div>
        {!stato && !account.messaggio && <p role="status" className={stili.messaggioAttivazione}>{testi.caricamento}</p>}
        {pillolaAccount && (
          <div className="flex flex-wrap items-center gap-3">
            <span className={stili.etichettaRecapito}>{testi.stato.etichetta}</span>
            <span className={pillola(pillolaAccount.tono)}>{pillolaAccount.testo}</span>
            {permessi.statoAccount && (
              <button type="button" className={pulsante("contorno", "piccolo")} disabled={account.occupato}
                onClick={() => setConferma(cambio)}>
                {cambio.etichetta}
              </button>
            )}
          </div>
        )}
        {stato && (
          <div className={stili.grigliaRecapiti}>
            <RecapitoAccount tipo="email" valore={valore("email")} verifica={verifica("email")} />
            <RecapitoAccount tipo="cellulare" valore={valore("cellulare")} verifica={verifica("cellulare")} />
          </div>
        )}
      </div>
      {account.selezionato && <DialogoVerifica clienteId={clienteId} contatto={account.selezionato}
        onVerificato={account.completato} onChiudi={() => account.setSelezionato(null)} />}
      {conferma && <DialogoConferma aperto titolo={conferma.conferma.titolo}
        messaggio={conferma.conferma.messaggio} conferma={conferma.conferma.conferma}
        pericolo={conferma.attivo === false}
        onConferma={() => { const attivo = conferma.attivo; setConferma(null); void account.cambiaStato(attivo); }}
        onAnnulla={() => setConferma(null)} />}
    </SezioneModulo>
  );
}
