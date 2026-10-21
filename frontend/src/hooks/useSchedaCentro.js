import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ROTTE, idValido } from "../config/routes/percorsi.js";
import { TESTI_AZIENDA as testi } from "../config/testi/azienda.js";
import { CENTRO_VUOTO, datiCentro, leggiCentro, modificheCentro, salvaCentro } from "../lib/azienda.js";

const NON_TROVATO = Object.assign(new Error(testi.erroreLettura), { stato: 404 });

/** Lettura e salvataggio della scheda di un centro. */
export default function useSchedaCentro() {
  const { aziendaId } = useParams();
  const navigate = useNavigate();
  const valido = idValido(aziendaId);

  const [lettura, setLettura] = useState({ caricamento: valido, errore: valido ? null : NON_TROVATO });
  // La scheda come l'ha restituita il server l'ultima volta (testata,
  // attuatori, permessi) e il modulo come e' a video.
  const [salvata, setSalvata] = useState(null);
  const [dati, setDati] = useState(CENTRO_VUOTO);
  const [avviso, setAvviso] = useState(null);
  const [salvataggio, setSalvataggio] = useState(false);

  // Cambio di id senza smontare la pagina: si riparte durante il render,
  // non in un effetto, per non mostrare un render con i dati vecchi.
  const [idLetto, setIdLetto] = useState(aziendaId);
  if (idLetto !== aziendaId) {
    setIdLetto(aziendaId);
    setLettura({ caricamento: valido, errore: valido ? null : NON_TROVATO });
    setSalvata(null);
    setAvviso(null);
  }

  useEffect(() => {
    if (!valido) return undefined;
    const controllo = new AbortController();
    leggiCentro(aziendaId, controllo.signal).then((scheda) => {
      setSalvata(scheda);
      setDati(datiCentro(scheda));
      setLettura({ caricamento: false, errore: null });
    }).catch((errore) => {
      if (!controllo.signal.aborted) setLettura({ caricamento: false, errore });
    });
    return () => controllo.abort();
  }, [aziendaId, valido]);

  const cambia = (evento) => {
    const { name, value } = evento.target;
    setDati((prec) => ({ ...prec, [name]: value }));
  };

  const salva = async (evento) => {
    evento.preventDefault();
    setAvviso(null);
    const modifiche = modificheCentro(dati, datiCentro(salvata), salvata.permessi);
    if (Object.keys(modifiche).length === 0) {
      setAvviso({ type: "info", text: testi.nessunaModifica });
      return;
    }
    setSalvataggio(true);
    try {
      const scheda = await salvaCentro(aziendaId, modifiche);
      setSalvata(scheda);
      setDati(datiCentro(scheda));
      setAvviso({ type: "success", text: testi.salvataggioRiuscito });
    } catch (errore) {
      setAvviso({ type: "error", text: errore.message });
    } finally {
      setSalvataggio(false);
    }
  };

  return {
    lettura,
    salvata,
    dati,
    cambia,
    avviso,
    salvataggio,
    salva,
    annulla: () => navigate(ROTTE.aziende),
    rottaElenco: ROTTE.aziende,
  };
}
