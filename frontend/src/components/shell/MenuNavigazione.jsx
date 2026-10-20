import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { logout } from "../../lib/logout.js";
import { etichettaContatore } from "../../lib/notizieDaLeggere.js";
import { useSessione } from "../../hooks/useSessione.js";
import { useNotizieDaLeggere } from "../../hooks/useNotizieDaLeggere.js";
import { vociMenuPerRuolo, ROTTE } from "../../config/routes/rotte.js";
import { LOGO_APPLICAZIONE } from "../../config/identita.js";
import { STILI_LOGO } from "../../config/styles/identita.js";
import { voceNavigazione, iconaNavigazione, testataMenu, voceUscita, contatoreNavigazione } from "../../config/styles/navigazione.js";
import { TESTI_NOTIZIE_DA_LEGGERE } from "../../config/testi/notizie.js";
import { LogOut } from "../../config/icone.js";
import TileProfilo from "../profilo/TileProfilo.jsx";

export default function MenuNavigazione({ onNaviga }) {
  const sessione = useSessione();
  const navigate = useNavigate();
  const [errore, setErrore] = useState("");
  // Notizie da leggere: il numero si vede, il nome accessibile lo dice per
  // esteso. Con zero la voce resta com'e'.
  const { totale: totaleNotizie } = useNotizieDaLeggere();
  const contatoreNotizie = etichettaContatore(totaleNotizie);
  async function esci() {
    setErrore("");
    try { await logout(); navigate(ROTTE.accesso, { replace: true }); }
    catch (e) { setErrore(e.message); }
  }
  return <div className="flex h-full flex-col">
    <div className={testataMenu()}><img {...LOGO_APPLICAZIONE} className={STILI_LOGO.navigazione} /></div>
    <nav aria-label="Navigazione principale" className="flex-1 space-y-1 overflow-y-auto p-3">
      {vociMenuPerRuolo(sessione?.ruoloCodice).map(({ rotta, etichetta, icona: Icona }) => {
        const contatore = rotta === ROTTE.notizie ? contatoreNotizie : "";
        return <NavLink key={rotta} to={rotta} onClick={onNaviga} className={({ isActive }) => voceNavigazione(isActive)}
          aria-label={contatore ? TESTI_NOTIZIE_DA_LEGGERE.voceMenu(etichetta, totaleNotizie) : undefined}>
          {({ isActive }) => <>
            <Icona aria-hidden="true" className={iconaNavigazione(isActive)} /><span>{etichetta}</span>
            {contatore && <span aria-hidden="true" className={contatoreNavigazione()}>{contatore}</span>}
          </>}
        </NavLink>;
      })}
    </nav>
    <div className="border-t border-bordo p-3">
      <TileProfilo onNaviga={onNaviga} />
      {errore && <p role="alert" className="text-sm text-negativo">{errore}</p>}
      <button type="button" onClick={esci} className={voceUscita()}><LogOut aria-hidden="true" /><span>Esci</span></button>
    </div>
  </div>;
}
