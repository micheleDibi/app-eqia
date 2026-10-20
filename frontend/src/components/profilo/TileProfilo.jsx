import { NavLink } from "react-router";
import { CircleUserRound } from "../../config/icone.js";
import { ROTTE } from "../../config/routes/rotte.js";
import { iconaNavigazione, voceNavigazione } from "../../config/styles/navigazione.js";
import { TESTI_PROFILO as testi } from "../../config/testi/profilo.js";
import { useSessione } from "../../hooks/useSessione.js";
import { nomeProfilo } from "../../lib/profilo.js";

export default function TileProfilo({ onNaviga }) {
  const nome = nomeProfilo(useSessione());
  return (
    <NavLink to={ROTTE.profilo} onClick={onNaviga} aria-label={`${nome}, ${testi.titolo}`}
      className={({ isActive }) => voceNavigazione(isActive)}>
      {({ isActive }) => <>
        <CircleUserRound aria-hidden="true" className={iconaNavigazione(isActive)} />
        <span className="truncate" title={nome}>{nome}</span>
      </>}
    </NavLink>
  );
}
