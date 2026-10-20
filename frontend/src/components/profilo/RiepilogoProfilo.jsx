import { STILI_PROFILO as stili } from "../../config/styles/profilo.js";
import { TESTI_PROFILO as testi } from "../../config/testi/profilo.js";
import { valoreProfilo } from "../../lib/profilo.js";

export default function RiepilogoProfilo({ profilo }) {
  return (
    <section className={stili.sezione} aria-labelledby="identita-profilo">
        <h2 id="identita-profilo" className={stili.titoloSezione}>{testi.dettagliUtente}</h2>
        <dl className={stili.dati}>
          <div className={stili.campo}><dt className={stili.etichetta}>{testi.username}</dt><dd className={stili.valore}>{valoreProfilo(profilo.username)}</dd></div>
          <div className={stili.campo}><dt className={stili.etichetta}>{testi.ruolo}</dt><dd className={stili.valore}>{valoreProfilo(profilo.ruolo)}</dd></div>
          {profilo.azienda?.trim() && <div className={stili.azienda}><dt className={stili.etichetta}>{testi.azienda}</dt><dd className={stili.valore}>{profilo.azienda}</dd></div>}
        </dl>
    </section>
  );
}
