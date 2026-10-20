import { useEffect, useRef, useState } from "react";
import { caricaPagina, creaPaginazione } from "../lib/pagineRemote";

const VUOTO = { elementi: [], altri: true, loading: true, errore: null };

export default function usePagineRemote(percorso, estrai, automatico = false) {
  const [stato, setStato] = useState(VUOTO);
  const carica = useRef(() => {});
  useEffect(() => {
    const pagine = creaPaginazione(
      async (skip, signal) => estrai(await caricaPagina(`${percorso}&skip=${skip}`, signal)),
      stato => setStato({ ...stato, percorso }),
    );
    function scorri() {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100) pagine.prossima();
    }
    const timer = setTimeout(pagine.prossima, 300);
    carica.current = pagine.prossima;
    if (automatico) window.addEventListener("scroll", scorri);
    return () => {
      clearTimeout(timer);
      pagine.annulla();
      window.removeEventListener("scroll", scorri);
    };
  }, [percorso, estrai, automatico]);
  return { ...(stato.percorso === percorso ? stato : VUOTO), carica: () => carica.current() };
}
