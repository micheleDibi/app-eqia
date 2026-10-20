import { useEffect, useState } from "react";
import { caricaSessione } from "../../lib/api.js";
import { haSessione, pulisciSessione } from "../../lib/sessione.js";
import { vaiAlLogin } from "../../lib/ritornoAccesso.js";
import { STILI_ACCESSO as stili } from "../../config/styles/accesso.js";
import { TESTI_ACCESSO as testi } from "../../config/testi/accesso.js";
import PaginaAccesso from "../accesso/PaginaAccesso.jsx";
import AlertMessage from "../AlertMessage.jsx";
import { useLocation } from "react-router";
import { useSessione } from "../../hooks/useSessione.js";
import { paginaAmmessa } from "../../config/routes/accesso.js";
import PaginaNonTrovata from "../PaginaNonTrovata.jsx";

export default function RichiediSessione({ children }) {
  const sessione = useSessione();
  const posizione = useLocation();
  const [pronta, setPronta] = useState(haSessione);
  const [errore, setErrore] = useState("");
  const [tentativo, setTentativo] = useState(0);
  useEffect(() => {
    let attivo = true;
    caricaSessione().then((valida) => {
      if (!attivo) return;
      if (valida) setPronta(true);
      else { pulisciSessione(); vaiAlLogin(); }
    }).catch((e) => { if (attivo) setErrore(e.message); });
    return () => { attivo = false; };
  }, [tentativo]);

  if (pronta && sessione) return paginaAmmessa(sessione.ruoloCodice, posizione.pathname) ? children : <PaginaNonTrovata />;
  return (
    <PaginaAccesso titolo={testi.verificaSessione}>
      {errore ? <AlertMessage message={{ type: "error", text: errore }} separato={false} />
        : <p role="status" className={stili.stato}>{testi.verificaInCorso}</p>}
      {errore && <button className={stili.azione} onClick={() => { setErrore(""); setTentativo((n) => n + 1); }}>{testi.riprova}</button>}
    </PaginaAccesso>
  );
}
