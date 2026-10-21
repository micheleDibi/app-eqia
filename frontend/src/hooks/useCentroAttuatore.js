import { useState } from "react";
import { TESTI_CENTRO as testi } from "../config/testi/anagrafica.js";
import { cambiaCentroAttuatore } from "../lib/anagrafica.js";
import { cercaCentroPartitaIva, partitaIvaCompleta } from "../lib/azienda.js";

/**
 * Centro di un attuatore: ricerca per partita IVA, che associa subito il
 * centro trovato, cambio e rimozione. Hanno effetto subito, non con "Salva
 * modifiche"; `onAggiornato` riceve la scheda restituita dal server.
 *
 * @param {number} clienteId
 * @param {object|null} centro il centro associato, come nella scheda
 * @param {(scheda: object) => void} onAggiornato
 */
export default function useCentroAttuatore(clienteId, centro, onAggiornato) {
  // Senza centro si parte dalla ricerca; con un centro, "Cambia centro" la apre.
  const [ricerca, setRicerca] = useState(!centro);
  const [partitaIva, setPartitaIva] = useState("");
  const [erroreRicerca, setErroreRicerca] = useState("");
  const [messaggio, setMessaggio] = useState(null);
  const [occupato, setOccupato] = useState(false);
  const [confermaRimozione, setConfermaRimozione] = useState(false);

  // Un centro diverso, associato o tolto: si riparte durante il render, non
  // in un effetto, per non mostrare un render con la vista vecchia.
  const idCentro = centro?.azienda_id ?? null;
  const [idMostrato, setIdMostrato] = useState(idCentro);
  if (idMostrato !== idCentro) {
    setIdMostrato(idCentro);
    setRicerca(!centro);
    setPartitaIva("");
    setErroreRicerca("");
  }

  const cerca = async () => {
    setErroreRicerca("");
    setMessaggio(null);
    if (!partitaIvaCompleta(partitaIva)) {
      setErroreRicerca(testi.pivaIncompleta);
      return;
    }
    setOccupato(true);
    try {
      const trovato = await cercaCentroPartitaIva(partitaIva);
      onAggiornato(await cambiaCentroAttuatore(clienteId, trovato.azienda_id));
      // Anche se e' lo stesso centro di prima, la ricerca si chiude.
      setRicerca(false);
      setMessaggio({ type: "success", text: testi.associato });
    } catch (errore) {
      setErroreRicerca(errore.message);
    } finally {
      setOccupato(false);
    }
  };

  const rimuovi = async () => {
    setConfermaRimozione(false);
    setMessaggio(null);
    setOccupato(true);
    try {
      onAggiornato(await cambiaCentroAttuatore(clienteId, null));
      setMessaggio({ type: "success", text: testi.rimosso });
    } catch (errore) {
      setMessaggio({ type: "error", text: errore.message });
    } finally {
      setOccupato(false);
    }
  };

  return {
    ricerca,
    apriRicerca: () => { setMessaggio(null); setRicerca(true); },
    annullaRicerca: () => { setRicerca(false); setPartitaIva(""); setErroreRicerca(""); },
    partitaIva,
    // Solo cifre, al massimo 11. Il limite non sta sul campo: una partita
    // IVA incollata con spazi o trattini perderebbe le ultime cifre.
    scriviPartitaIva: (valore) => { setPartitaIva(valore.replace(/\D/g, "").slice(0, 11)); setErroreRicerca(""); },
    erroreRicerca,
    cerca,
    messaggio,
    occupato,
    confermaRimozione,
    chiediRimozione: () => setConfermaRimozione(true),
    annullaRimozione: () => setConfermaRimozione(false),
    rimuovi,
  };
}
