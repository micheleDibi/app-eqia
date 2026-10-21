import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import useQueryPagina from "./useQueryPagina.js";
import useNavigazioneElenco from "./useNavigazioneElenco.js";
import { QUERY_ANAGRAFICA } from "../config/routes/query.js";
import { PERCORSI, ROTTA_INIZIALE, ROTTE, idValido } from "../config/routes/percorsi.js";
import { TESTI_ANAGRAFICA as testi } from "../config/testi/anagrafica.js";
import {
  ANAGRAFICA_VUOTA, accediCome, copiaResidenza, datiModulo, leggiAnagrafica, modificheAnagrafica,
  salvaAnagrafica, schedaAttiva, schedeAnagrafica,
} from "../lib/anagrafica.js";

const NON_TROVATA = Object.assign(new Error(testi.erroreLettura), { stato: 404 });

/**
 * Lettura e salvataggio della scheda di un sottoscrittore o di un attuatore.
 * `tipo` viene dall'indirizzo: un'anagrafica dell'altro tipo non si apre
 * qui, come un id inesistente. Dopo un salvataggio riuscito si torna da dove
 * si era arrivati (l'elenco con i suoi filtri, o il centro), con l'esito
 * nello stato della navigazione.
 */
export default function useSchedaAnagrafica(tipo) {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const elenco = tipo === "attuatore" ? ROTTE.attuatori : ROTTE.sottoscrittori;
  const { ritorno: ritornoElenco } = useNavigazioneElenco(elenco);
  const [{ scheda: richiesta }, aggiornaQuery] = useQueryPagina(QUERY_ANAGRAFICA);
  const valido = idValido(clienteId);

  // Un attuatore aperto dalla sezione Attuatori di un centro torna a quel
  // centro; il resto torna all'elenco.
  const centroDiPartenza = tipo === "attuatore" && idValido(location.state?.centro) ? location.state.centro : null;
  const ritorno = centroDiPartenza
    ? { rotta: PERCORSI.aziende.dettaglio(centroDiPartenza), etichetta: testi.ritornoCentro }
    : { rotta: ritornoElenco, etichetta: testi.ritorno(tipo) };

  const [lettura, setLettura] = useState({ caricamento: valido, errore: valido ? null : NON_TROVATA });
  // La scheda come l'ha restituita il server l'ultima volta (testata, Centro,
  // Utente) e il modulo come e' a video.
  const [salvata, setSalvata] = useState(null);
  const [dati, setDati] = useState(ANAGRAFICA_VUOTA);
  const [attivazione, setAttivazione] = useState(null);
  const [avviso, setAvviso] = useState(null);
  const [salvataggio, setSalvataggio] = useState(false);

  // Cambio di id o di tipo senza smontare la pagina: si riparte durante il
  // render, non in un effetto, per non mostrare un render con i dati vecchi.
  const chiave = `${tipo}/${clienteId}`;
  const [chiaveLetta, setChiaveLetta] = useState(chiave);
  if (chiaveLetta !== chiave) {
    setChiaveLetta(chiave);
    setLettura({ caricamento: valido, errore: valido ? null : NON_TROVATA });
    setSalvata(null);
    setAvviso(null);
  }

  useEffect(() => {
    if (!valido) return undefined;
    const controllo = new AbortController();
    leggiAnagrafica(clienteId, controllo.signal).then((scheda) => {
      if (controllo.signal.aborted) return;
      if (scheda.tipo !== tipo) throw NON_TROVATA;
      setSalvata(scheda);
      setDati(datiModulo(scheda));
      setAttivazione(scheda.account.attivazione);
      setLettura({ caricamento: false, errore: null });
    }).catch((errore) => {
      if (!controllo.signal.aborted) setLettura({ caricamento: false, errore });
    });
    return () => controllo.abort();
  }, [clienteId, tipo, valido]);

  const cambia = (evento) => {
    const { name, value } = evento.target;
    setDati((prec) => ({ ...prec, [name]: value }));
  };

  const salva = async (evento) => {
    evento.preventDefault();
    setAvviso(null);
    const modifiche = modificheAnagrafica(dati, datiModulo(salvata));
    if (Object.keys(modifiche).length === 0) {
      setAvviso({ type: "info", text: testi.nessunaModifica });
      return;
    }
    setSalvataggio(true);
    try {
      const scheda = await salvaAnagrafica(clienteId, modifiche);
      // Un salvataggio che cambia il tipo (ruolo dato a un sottoscrittore o
      // tolto a un attuatore) lo dice: l'anagrafica lascia l'elenco di partenza.
      const text = scheda.tipo === tipo ? testi.salvataggioRiuscito : testi.cambioTipo(scheda.tipo);
      navigate(ritorno.rotta, { state: { avviso: { type: "success", text } } });
    } catch (errore) {
      setAvviso({ type: "error", text: errore.message });
    } finally {
      setSalvataggio(false);
    }
  };

  const accedi = async () => {
    setAvviso(null);
    try {
      await accediCome(salvata.account.utente_id);
      window.location.assign(ROTTA_INIZIALE);
    } catch (errore) {
      setAvviso({ type: "error", text: errore.message });
    }
  };

  return {
    clienteId: Number(clienteId),
    lettura,
    salvata,
    dati,
    scegliRelazione: (chiave, nome, riga) => setDati(prec => ({
      ...prec, [chiave]: riga?.id ?? null, [nome]: riga?.label ?? null,
    })),
    cambia,
    copiaResidenza: () => setDati(copiaResidenza),
    // Il padre scelto nella finestra: si salva con "Salva modifiche".
    scegliPadre: (padre) => setDati((prec) => ({ ...prec, padre })),
    attivazione,
    // Dopo una verifica o un cambio di stato nella sezione account.
    aggiornaAccount: (stato) => setAttivazione(stato.attivazione),
    // Il centro si salva subito: della scheda restituita si prende solo il
    // centro, il resto del modulo resta com'e' a video.
    aggiornaCentro: (scheda) => setSalvata((prec) => ({
      ...prec, centro: scheda.centro, centro_nascosto: scheda.centro_nascosto, permessi: scheda.permessi,
    })),
    avviso,
    salvataggio,
    salva,
    annulla: () => navigate(ritorno.rotta),
    accedi,
    ritorno,
    schede: schedeAnagrafica(tipo).map((id) => ({ id, label: testi.schede[id] })),
    attiva: schedaAttiva(tipo, richiesta),
    setAttiva: (scheda) => aggiornaQuery({ scheda }, { replace: false }),
  };
}
