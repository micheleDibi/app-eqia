import { useEffect, useRef, useState } from "react";
import { creaScheda, valoriIniziali } from "../lib/gestione.js";
import { TESTI_GESTIONE as testi } from "../config/testi/gestione.js";

export default function useSchedaGestione(tipo, onCreato) {
  const [dati, setDati] = useState(() => valoriIniziali(tipo));
  const [avviso, setAvviso] = useState(null);
  const [salvataggio, setSalvataggio] = useState(false);
  const corrente = useRef(true);
  useEffect(() => {
    corrente.current = true;
    return () => { corrente.current = false; };
  }, []);
  const salva = async evento => {
    evento.preventDefault();
    if (salvataggio) return;
    setSalvataggio(true); setAvviso(null);
    try {
      const riga = await creaScheda(tipo, dati);
      if (!corrente.current) return;
      onCreato(riga);
    } catch (err) {
      if (corrente.current) setAvviso({ type: "error", text: err.message || testi.errore });
    } finally { if (corrente.current) setSalvataggio(false); }
  };
  const cambia = evento => setDati(prec => ({ ...prec, [evento.target.name]: evento.target.value }));
  return { dati, setDati, avviso, salvataggio, salva, cambia };
}
