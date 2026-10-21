import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

/**
 * L'esito lasciato dalla pagina precedente nello stato della navigazione,
 * per esempio "Modifiche salvate." al ritorno da una scheda. Si legge
 * all'arrivo e si toglie dalla cronologia: ricaricando la pagina, o
 * tornandoci con Avanti, non ricompare.
 */
export default function useAvvisoArrivato() {
  const location = useLocation();
  const navigate = useNavigate();
  const [avviso] = useState(() => location.state?.avviso ?? null);
  const ripulito = useRef(false);
  useEffect(() => {
    if (!avviso || ripulito.current) return;
    ripulito.current = true;
    const stato = { ...location.state };
    delete stato.avviso;
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: stato });
  }, [avviso, location, navigate]);
  return avviso;
}
