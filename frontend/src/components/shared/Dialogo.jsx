import { useDialogo } from "../../hooks/useDialogo.js";

/** Semantica modale, Escape e click sul velo condivisi da menu e finestre. */
export default function Dialogo({ aperto, onChiudi, etichetta, variante = "finestra", id, children }) {
  const riferimento = useDialogo(aperto);
  const chiudiDalVelo = (evento) => {
    if (evento.target !== evento.currentTarget) return;
    const area = evento.currentTarget.getBoundingClientRect();
    if (evento.clientX < area.left || evento.clientX > area.right ||
        evento.clientY < area.top || evento.clientY > area.bottom) onChiudi();
  };
  return (
    <dialog ref={riferimento} id={id} aria-label={etichetta} inert={!aperto}
      className={`dialogo dialogo--${variante}`} onClick={chiudiDalVelo}
      onClose={() => { if (!riferimento.current?.open) onChiudi(); }}
      onCancel={(evento) => { evento.preventDefault(); onChiudi(); }}>
      {children}
    </dialog>
  );
}
