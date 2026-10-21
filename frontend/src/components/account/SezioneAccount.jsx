import AlertMessage from "../AlertMessage.jsx";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import RecapitiAccount from "./RecapitiAccount.jsx";
import StatoAccount from "./StatoAccount.jsx";
import { useAccount } from "../../hooks/useAccount.js";
import { STILI_ANAGRAFICA as stili } from "../../config/styles/anagrafica.js";
import { TESTI_ACCOUNT as testi } from "../../config/testi/account.js";

/**
 * Sezione account della scheda anagrafica (docs/contratti-account.md):
 * verifica di email e cellulare e stato dell'account. La scheda la monta su
 * un'anagrafica gia' salvata; i valori dei contatti si modificano nella
 * scheda, qui si verificano. La scheda di sottoscrittori e attuatori usa i
 * due pezzi separati: recapiti nei Contatti, stato nella scheda Utente.
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
  const stato = account.stato;

  return (
    <SezioneModulo titolo={testi.titolo} descrizione={testi.descrizione} griglia={false}>
      <div className={stili.colonnaContatti}>
        <div className={stili.messaggiContatti}>
          <AlertMessage message={account.messaggio} separato={false} />
          {stato?.attivazione === "in_attesa" && <p className={stili.messaggioAttivazione}>{testi.attivazione}</p>}
        </div>
        {!stato && !account.messaggio && <p role="status" className={stili.messaggioAttivazione}>{testi.caricamento}</p>}
        {stato && (
          <div className="flex flex-wrap items-center gap-3">
            <span className={stili.etichettaRecapito}>{testi.stato.etichetta}</span>
            <StatoAccount attivazione={stato.attivazione} modificabile={permessi.statoAccount}
              occupato={account.occupato} onCambia={account.cambiaStato} />
          </div>
        )}
        <RecapitiAccount account={account} clienteId={clienteId} valori={valori} />
      </div>
    </SezioneModulo>
  );
}
