import { useEffect, useRef, useState } from "react";
import { leggiScheda, salvaScheda, valoriIniziali } from "../lib/gestione.js";
import { TESTI_GESTIONE as testi } from "../config/testi/gestione.js";

export default function useSchedaGestione(tipo, id, onCreato) {
  const [dati, setDati] = useState(() => valoriIniziali(tipo));
  const [salvati, setSalvati] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [errore, setErrore] = useState(null);
  const [avviso, setAvviso] = useState(null);
  const [salvataggio, setSalvataggio] = useState(false);
  const [versione, setVersione] = useState(0);
  const corrente = useRef(true);
  useEffect(() => {
    corrente.current = true;
    return () => { corrente.current = false; };
  }, []);
  useEffect(() => {
    if (!id) return undefined;
    const controller = new AbortController();
    leggiScheda(tipo, id, controller.signal).then(riga => {
      if (controller.signal.aborted) return;
      setSalvati(riga); setDati(riga); setErrore(null); setLoading(false);
    }).catch(err => { if (!controller.signal.aborted) { setErrore(err); setLoading(false); } });
    return () => controller.abort();
  }, [tipo, id, versione]);
  const salva = async evento => {
    evento.preventDefault();
    if (salvataggio) return;
    setSalvataggio(true); setAvviso(null);
    try {
      const riga = await salvaScheda(tipo, id, dati);
      if (!corrente.current) return;
      if (!id) { onCreato(riga); return; }
      setSalvati(riga); setDati(riga); setAvviso({ type: "success", text: testi.salvato });
    } catch (err) {
      if (corrente.current) setAvviso({ type: "error", text: err.message || testi.errore });
    } finally { if (corrente.current) setSalvataggio(false); }
  };
  const cambia = evento => setDati(prec => ({ ...prec, [evento.target.name]: evento.target.value }));
  return { dati, setDati, salvati, loading, errore, avviso, salvataggio, salva, cambia,
    ricarica: () => setVersione(v => v + 1) };
}
