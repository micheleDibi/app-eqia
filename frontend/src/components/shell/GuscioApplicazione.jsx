import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import Dialogo from "../shared/Dialogo.jsx";
import MenuNavigazione from "./MenuNavigazione.jsx";
import { useSchermoCompatto } from "../../hooks/useSchermoCompatto.js";
import { useIngresso } from "../../hooks/useIngresso.js";
import { CircleUserRound, Menu, X } from "../../config/icone.js";
import { LOGO_APPLICAZIONE } from "../../config/identita.js";
import { ROTTE } from "../../config/routes/percorsi.js";
import { STILI_LOGO } from "../../config/styles/identita.js";
import { areaContenuto, barraLaterale, barraSuperiore, pulsanteMenu } from "../../config/styles/guscio.js";
import { pulsanteIcona } from "../../config/styles/pulsante.js";

export default function GuscioApplicazione() {
  const { pathname } = useLocation();
  const compatto = useSchermoCompatto();
  const contenuto = useIngresso(pathname);
  const [apertoSu, setApertoSu] = useState(null);
  const aperto = compatto && apertoSu === pathname;
  const chiudi = () => setApertoSu(null);
  return <div className="min-h-screen bg-tela">
    <aside className={barraLaterale()}><MenuNavigazione /></aside>
    <header className={barraSuperiore()}>
      <button type="button" onClick={() => setApertoSu(pathname)} className={pulsanteMenu()}
        aria-label="Apri il menu" aria-expanded={aperto} aria-controls="menu-mobile"><Menu aria-hidden="true" /></button>
      <img {...LOGO_APPLICAZIONE} className={STILI_LOGO.barraMobile} />
      <NavLink to={ROTTE.profilo} aria-label="Il mio profilo" className={pulsanteIcona()}><CircleUserRound aria-hidden="true" /></NavLink>
    </header>
    <Dialogo id="menu-mobile" aperto={aperto} onChiudi={chiudi} etichetta="Menu" variante="menu">
      <button type="button" onClick={chiudi} aria-label="Chiudi il menu" className={`${pulsanteIcona()} absolute right-3 top-2.5`}><X aria-hidden="true" /></button>
      <MenuNavigazione onNaviga={chiudi} />
    </Dialogo>
    <div className={areaContenuto()}><main ref={contenuto} className="movimento-pagina"><Outlet /></main></div>
  </div>;
}
