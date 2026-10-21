import DialogoVerifica from "./DialogoVerifica.jsx";
import RecapitoAccount from "./RecapitoAccount.jsx";
import { STILI_ANAGRAFICA as stili } from "../../config/styles/anagrafica.js";

/**
 * Le schede di email e cellulare con la loro verifica e la finestra del
 * codice. `account` viene da useAccount: messaggi e stato li mostra chi
 * compone (SezioneAccount, i Contatti della scheda anagrafica).
 *
 * @param {{
 *   account: ReturnType<typeof import("../../hooks/useAccount.js").useAccount>,
 *   clienteId: number,
 *   valori?: { email?: string, cellulare?: string },
 *   onCambia?: (evento: import("react").ChangeEvent<HTMLInputElement>) => void,
 * }} props
 *   valori: i contatti come sono a video, per dire "Salva le modifiche"
 *   quando sono diversi da quelli salvati; senza, quelli salvati.
 *   onCambia: email e cellulare si scrivono qui, nei campi `email` e
 *   `cellulare` del modulo; senza, sono in sola lettura.
 */
export default function RecapitiAccount({ account, clienteId, valori, onCambia }) {
  const stato = account.stato;
  if (!stato) return null;
  const valore = (tipo) => valori?.[tipo] ?? stato[tipo]?.valore ?? "";
  const verifica = (tipo) => ({
    disponibile: Boolean(clienteId), stato: stato[tipo],
    apri: () => account.setSelezionato({ tipo, valore: valore(tipo) }),
  });
  return (
    <>
      <div className={stili.grigliaRecapiti}>
        <RecapitoAccount tipo="email" valore={valore("email")} verifica={verifica("email")} onChange={onCambia} />
        <RecapitoAccount tipo="cellulare" valore={valore("cellulare")} verifica={verifica("cellulare")}
          onChange={onCambia} />
      </div>
      {account.selezionato && <DialogoVerifica clienteId={clienteId} contatto={account.selezionato}
        onVerificato={account.completato} onChiudi={() => account.setSelezionato(null)} />}
    </>
  );
}
