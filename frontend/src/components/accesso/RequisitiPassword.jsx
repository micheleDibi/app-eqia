import { useEffect, useState } from "react";
import { robustezza, valutaPassword } from "../../lib/passwordPolicy.js";
import { TESTI_PASSWORD as testi } from "../../config/testi/accesso.js";
import { PAUSA_ANNUNCIO_DIGITAZIONE_MS } from "../../config/interazioni.js";
import { STILI_ACCESSO } from "../../config/styles/accesso.js";
import { STILI_PASSWORD as stili, COLORI_REGOLA, segmentoRobustezza } from "../../config/styles/password.js";
import { ICONE_REGOLA_PASSWORD } from "../../config/icone.js";

function useAnnuncio(password) {
  const [annuncio, setAnnuncio] = useState("");
  useEffect(() => {
    const attesa = setTimeout(() => {
      const verificabili = valutaPassword(password).regole.filter((r) => r.stato !== "non_verificabile");
      setAnnuncio(password === "" ? "" : testi.riepilogo(
        verificabili.filter((r) => r.stato === "ok").length, verificabili.length, robustezza(password).etichetta,
      ));
    }, PAUSA_ANNUNCIO_DIGITAZIONE_MS);
    return () => clearTimeout(attesa);
  }, [password]);
  return annuncio;
}

export default function RequisitiPassword({ password, regoleRifiutate }) {
  const { regole } = valutaPassword(password);
  const forza = robustezza(password);
  const annuncio = useAnnuncio(password);
  return (
    <div className={STILI_ACCESSO.contenuto}>
      <div className={stili.indicatore}>
        <div className={stili.intestazione}><span>{testi.forza}</span><span>{forza.etichetta}</span></div>
        <div className={stili.segmenti} aria-hidden="true">
          {[0, 1, 2, 3].map((indice) => <span key={indice} className={segmentoRobustezza(forza.livello, indice)} />)}
        </div>
      </div>
      <ul id="regole-password" className={stili.regole}>
        {regole.map((regola) => {
          const stato = regoleRifiutate.includes(regola.id) && regola.stato !== "ok" ? "ko" : regola.stato;
          const IconaRegola = ICONE_REGOLA_PASSWORD[stato];
          return <li key={regola.id} className={`${stili.regola} ${COLORI_REGOLA[stato]}`}>
            <IconaRegola aria-hidden="true" className={stili.simbolo} />
            <span>{regola.testo}
              {stato === "non_verificabile" && <span className={stili.nota}>{testi.alSalvataggio}</span>}
              <span className={STILI_ACCESSO.soloLettura}>: {testi.lettura[stato]}</span>
            </span>
          </li>;
        })}
      </ul>
      <p aria-live="polite" aria-atomic="true" className={STILI_ACCESSO.soloLettura}>{annuncio}</p>
    </div>
  );
}
