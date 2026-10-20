import { LOGO_EDUNEWS24 } from "../../config/identita.js";
import { STILI_EDUNEWS24 } from "../../config/styles/edunews24.js";
import { STILI_LOGO } from "../../config/styles/identita.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";
import FolioEduNews24 from "./FolioEduNews24.jsx";
import SocialEduNews24 from "./SocialEduNews24.jsx";

/**
 * Testata EduNews24 della pagina, in cima al foglio: il logo (unico punto
 * della pagina in cui compare), la riga che presenta il portale, i social con
 * il nome della rete e, sotto, il folio della scheda attiva. Con la funzione
 * spenta (`spenta`) il folio non c'e' e la presentazione non parla dei titoli,
 * che non ci sono. `errore`: il primo caricamento della scheda e' fallito
 * (il folio lo dice anche senza un'ora).
 */
export default function TestataEduNews24({ aggiornatoIl, stantio = false, errore = false, adesso, spenta = false }) {
  return (
    <header className="edunews24-testata">
      <img {...LOGO_EDUNEWS24} className={["edunews24-testata__logo", STILI_LOGO.edunews24Pagina].join(" ")} />
      <p className={["edunews24-testata__presentazione", STILI_EDUNEWS24.presentazione].join(" ")}>
        {spenta ? testi.presentazione : `${testi.presentazione} ${testi.presentazioneTitoli}`}
      </p>
      <div className="edunews24-testata__lato">
        <SocialEduNews24 variante="pagina" />
        {!spenta && <FolioEduNews24 aggiornatoIl={aggiornatoIl} stantio={stantio} errore={errore} adesso={adesso} />}
      </div>
    </header>
  );
}
