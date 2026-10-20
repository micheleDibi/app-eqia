import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { TESTI_ACCESSO } from "../config/testi/accesso.js";

export function useContestoAccesso() {
  const location = useLocation();
  const navigate = useNavigate();
  const [aggiornata] = useState(() => location.state?.passwordAggiornata === true);
  const ripulito = useRef(false);
  useEffect(() => {
    if (!aggiornata || ripulito.current) return;
    ripulito.current = true;
    navigate(location.pathname, { replace: true, state: null });
  }, [aggiornata, navigate, location.pathname]);
  if (aggiornata) return TESTI_ACCESSO.aggiornata;
  return new URLSearchParams(location.search).get("sessione") === "scaduta" ? TESTI_ACCESSO.scaduta : "";
}
