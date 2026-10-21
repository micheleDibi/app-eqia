import { useState } from "react";
import Dialogo from "../shared/Dialogo.jsx";
import RisultatiRelazione from "./RisultatiRelazione.jsx";
import { pulsante } from "../../config/styles/pulsante.js";
import { STILI_GESTIONE as stili } from "../../config/styles/gestione.js";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";

export default function SceltaRelazione({ id, etichetta, tipo, valore, nome, onChange, disabilitato = false }) {
  const [aperto, setAperto] = useState(false);
  return <div className={stili.selezione}>
    <button id={id} type="button" className={`${pulsante("contorno")} ${stili.scelta}`} disabled={disabilitato}
      aria-label={`${testi.cambia} ${etichetta.toLowerCase()}`} onClick={() => setAperto(true)}>
      <span>{valore ? nome || String(valore) : testi.nessuno}</span>
      <span>{testi.cambia}</span>
    </button>
    <Dialogo aperto={aperto} onChiudi={() => setAperto(false)} etichetta={etichetta}>
      {aperto && <RisultatiRelazione tipo={tipo} titolo={etichetta}
        onScegli={riga => { onChange(riga); setAperto(false); }} onChiudi={() => setAperto(false)} />}
    </Dialogo>
  </div>;
}
