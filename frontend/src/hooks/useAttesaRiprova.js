import { useCallback, useEffect, useState } from "react";

/**
 * Attesa prima di "Riprova" dopo un 503 con Retry-After: `bloccato` guida
 * aria-disabled, `iniziali` sono i secondi da mostrare. Il testo non conta
 * alla rovescia: allo sblocco spariscono insieme testo e disattivazione.
 * Un solo setTimeout, annullato a ogni nuovo avvio e allo smontaggio.
 */
export function useAttesaRiprova() {
  const [attesa, setAttesa] = useState({ secondi: 0, giro: 0 });
  const avvia = useCallback((secondi) => {
    const intero = Number.isFinite(secondi) && secondi > 0 ? Math.ceil(secondi) : 0;
    setAttesa((prima) => ({ secondi: intero, giro: prima.giro + 1 }));
  }, []);
  useEffect(() => {
    if (attesa.secondi <= 0) return undefined;
    const { giro } = attesa;
    const timer = setTimeout(() => {
      setAttesa((ora) => (ora.giro === giro ? { secondi: 0, giro } : ora));
    }, attesa.secondi * 1000);
    return () => clearTimeout(timer);
  }, [attesa]);
  return { bloccato: attesa.secondi > 0, iniziali: attesa.secondi, avvia };
}
