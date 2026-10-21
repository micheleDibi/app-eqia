import AlertMessage from "../AlertMessage.jsx";
import RecapitiAccount from "../account/RecapitiAccount.jsx";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import { useAccount } from "../../hooks/useAccount.js";
import { campo, etichetta } from "../../config/styles/campo.js";
import { STILI_ANAGRAFICA as stili } from "../../config/styles/anagrafica.js";
import { TESTI_ACCOUNT } from "../../config/testi/account.js";
import { TESTI_CONTATTI as testi } from "../../config/testi/anagrafica.js";

/**
 * Contatti della scheda Anagrafica: email e cellulare in due schede in
 * evidenza, da modificare e da verificare, poi PEC e telefono come recapiti
 * secondari. Lo stato dell'account sta nella scheda Utente.
 *
 * @param {{
 *   clienteId: number,
 *   dati: object,
 *   onCambia: Function,
 *   onStato: Function,
 * }} props
 *   onStato: il nuovo stato dell'account dopo una verifica (la verifica di
 *   entrambi i contatti puo' attivarlo).
 */
export default function ContattiAnagrafica({ clienteId, dati, onCambia, onStato }) {
  const account = useAccount(clienteId, onStato);
  // Recapito secondario: fuori da CampoModulo perche' sta in una griglia a
  // colonne automatiche, non in quella di 6.
  const secondario = (nome, inputMode) => (
    <div className={stili.campoSecondario}>
      <label htmlFor={nome} className={etichetta("secondaria")}>{testi[nome]}</label>
      <input id={nome} type="text" inputMode={inputMode} name={nome} value={dati[nome]} onChange={onCambia}
        className={campo("secondario")} />
    </div>
  );

  return (
    <SezioneModulo titolo={testi.titolo} descrizione={TESTI_ACCOUNT.descrizione} griglia={false}>
      <div className={stili.colonnaContatti}>
        <div className={stili.messaggiContatti}>
          <AlertMessage message={account.messaggio} separato={false} />
          {account.stato?.attivazione === "in_attesa" && (
            <p className={stili.messaggioAttivazione}>{TESTI_ACCOUNT.attivazione}</p>
          )}
        </div>
        {!account.stato && !account.messaggio && (
          <p role="status" className={stili.messaggioAttivazione}>{TESTI_ACCOUNT.caricamento}</p>
        )}
        <RecapitiAccount account={account} clienteId={clienteId}
          valori={{ email: dati.email, cellulare: dati.cellulare }} onCambia={onCambia} />
        <div className={stili.altriRecapiti}>
          <span className={stili.didascalia}>{testi.altriRecapiti}</span>
          <div className={stili.grigliaAltriRecapiti}>
            {secondario("pec", "email")}
            {secondario("telefono", "tel")}
          </div>
        </div>
      </div>
    </SezioneModulo>
  );
}
