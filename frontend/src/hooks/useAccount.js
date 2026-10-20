import { useEffect, useState } from "react";
import { cambiaStatoAccount, leggiAccount } from "../lib/account.js";
import { TESTI_ACCOUNT as testi } from "../config/testi/account.js";

/**
 * Contatti e stato dell'account di un'anagrafica, con la verifica in corso
 * (`selezionato`) e il cambio di stato.
 */
export function useAccount(clienteId) {
  const [stato, setStato] = useState(null);
  const [messaggio, setMessaggio] = useState(null);
  const [selezionato, setSelezionato] = useState(null);
  const [occupato, setOccupato] = useState(false);

  useEffect(() => {
    let corrente = true;
    if (!clienteId) return undefined;
    leggiAccount(clienteId).then((dati) => {
      if (corrente) setStato(dati);
    }).catch((errore) => {
      if (corrente) setMessaggio({ type: "error", text: errore.message || testi.erroreLettura });
    });
    return () => { corrente = false; };
  }, [clienteId]);

  /** Fine della verifica di un contatto: nuovo stato e messaggio del server. */
  const completato = (dati) => {
    setStato(dati);
    setMessaggio({ type: dati.credenziali_inviate === false ? "warning" : "success", text: dati.message });
    setSelezionato(null);
  };

  const cambiaStato = async (attivo) => {
    setOccupato(true);
    setMessaggio(null);
    try {
      setStato(await cambiaStatoAccount(clienteId, attivo));
      setMessaggio({ type: "success", text: attivo ? testi.stato.attivato : testi.stato.disattivato });
    } catch (errore) {
      setMessaggio({ type: "error", text: errore.message });
    } finally {
      setOccupato(false);
    }
  };

  return { stato, messaggio, selezionato, setSelezionato, completato, cambiaStato, occupato };
}
