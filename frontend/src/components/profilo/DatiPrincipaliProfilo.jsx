import { STILI_PROFILO as stili } from "../../config/styles/profilo.js";
import { sezioniProfilo } from "../../lib/profilo.js";
import SezioneProfilo from "./SezioneProfilo.jsx";

export default function DatiPrincipaliProfilo({ profilo }) {
  const [anagrafica, contatti, residenza, domicilio] = sezioniProfilo(profilo);
  return (
    <div className={stili.sezioni}>
      <SezioneProfilo {...anagrafica} />
      <hr className={stili.separatore} />
      <div className={stili.colonne}>
        <SezioneProfilo {...residenza} indirizzo />
        <SezioneProfilo {...domicilio} indirizzo />
      </div>
      <hr className={stili.separatore} />
      <SezioneProfilo {...contatti} />
    </div>
  );
}
