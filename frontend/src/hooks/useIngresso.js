import { useLayoutEffect, useRef } from "react";

/** Riavvia l'ingresso CSS soltanto al cambio chiave, senza perdere stato o focus. */
export function useIngresso(chiave) {
  const riferimento = useRef(null);
  const precedente = useRef(null);
  useLayoutEffect(() => {
    const elemento = riferimento.current;
    if (!elemento) return;
    if (getComputedStyle(elemento).animationName === "none") {
      precedente.current?.cancel();
      return;
    }
    // Conserva anche l'animazione terminata, che getAnimations non elenca più.
    // Non la scollega dal CSS: durate e movimento ridotto restano nel tema.
    const corrente = elemento.getAnimations().find(a => a.animationName?.startsWith("ingresso-"));
    const animazione = corrente ?? precedente.current;
    if (animazione?.effect?.target !== elemento) return;
    animazione.currentTime = 0;
    animazione.play();
    precedente.current = animazione;
  }, [chiave]);
  return riferimento;
}
