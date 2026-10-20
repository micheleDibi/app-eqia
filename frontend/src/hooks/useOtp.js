import { useEffect, useRef, useState } from "react";

export function useOtp({ iniziale, operazioni, onVerificato }) {
  const [sfida, setSfida] = useState(iniziale ?? null);
  const [codice, setCodice] = useState("");
  const [errore, setErrore] = useState("");
  const [occupato, setOccupato] = useState(false);
  const [attesa, setAttesa] = useState(iniziale?.reinvia_tra ?? 0);
  const inCorso = useRef(false);
  const attivo = attesa > 0;
  useEffect(() => {
    if (!attivo) return undefined;
    const timer = setInterval(() => setAttesa((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [attivo]);

  const esegui = async (verifica) => {
    if (inCorso.current || (!verifica && attivo)) return;
    inCorso.current = true;
    setOccupato(true);
    setErrore("");
    try {
      if (verifica) onVerificato(await operazioni.verifica({ sfida: sfida.sfida, codice }));
      else {
        const nuova = await operazioni.invia(sfida);
        setSfida(nuova);
        setCodice("");
        setAttesa(nuova.reinvia_tra);
      }
    } catch (erroreApi) {
      setErrore(erroreApi.message);
      setAttesa((precedente) => Math.max(precedente, erroreApi.attesaSecondi || 0));
    } finally {
      inCorso.current = false;
      setOccupato(false);
    }
  };
  return { sfida, codice, setCodice, errore, occupato, attesa, esegui };
}
