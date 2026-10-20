import { useEffect, useLayoutEffect, useRef } from "react";

/** Il nodo resta montato per completare l'uscita CSS; close libera subito il focus. */
export function useDialogo(aperto) {
  const riferimento = useRef(null);
  useLayoutEffect(() => {
    const dialogo = riferimento.current;
    if (aperto && !dialogo.open) {
      dialogo.showModal();
      dialogo.querySelector("[data-focus-iniziale]")?.focus({ preventScroll: true });
    }
    if (!aperto && dialogo.open) dialogo.close();
  }, [aperto]);
  useEffect(() => {
    if (!aperto) return undefined;
    const precedente = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = precedente; };
  }, [aperto]);
  return riferimento;
}
