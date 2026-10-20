import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { logout } from "../../lib/logout.js";
import { useSessione } from "../../hooks/useSessione.js";
import { vociMenuPerRuolo, ROTTE } from "../../config/routes/rotte.js";
import { LOGO_APPLICAZIONE } from "../../config/identita.js";
import { STILI_LOGO } from "../../config/styles/identita.js";
import { voceNavigazione, iconaNavigazione, testataMenu, voceUscita } from "../../config/styles/navigazione.js";
import { LogOut } from "../../config/icone.js";
import TileProfilo from "../profilo/TileProfilo.jsx";

export default function MenuNavigazione({ onNaviga }) {
  const sessione = useSessione();
  const navigate = useNavigate();
  const [errore, setErrore] = useState("");
  async function esci() {
    setErrore("");
    try { await logout(); navigate(ROTTE.accesso, { replace: true }); }
    catch (e) { setErrore(e.message); }
  }
  return <div className="flex h-full flex-col">
    <div className={testataMenu()}><img {...LOGO_APPLICAZIONE} className={STILI_LOGO.navigazione} /></div>
    <nav aria-label="Navigazione principale" className="flex-1 space-y-1 overflow-y-auto p-3">
      {vociMenuPerRuolo(sessione?.ruoloCodice).map(({ rotta, etichetta, icona: Icona }) =>
        <NavLink key={rotta} to={rotta} onClick={onNaviga} className={({ isActive }) => voceNavigazione(isActive)}>
          {({ isActive }) => <><Icona aria-hidden="true" className={iconaNavigazione(isActive)} /><span>{etichetta}</span></>}
        </NavLink>)}
    </nav>
    <div className="border-t border-bordo p-3">
      <TileProfilo onNaviga={onNaviga} />
      {errore && <p role="alert" className="text-sm text-negativo">{errore}</p>}
      <button type="button" onClick={esci} className={voceUscita()}><LogOut aria-hidden="true" /><span>Esci</span></button>
    </div>
  </div>;
}
