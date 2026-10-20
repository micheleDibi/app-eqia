import { LoaderCircle } from "../../config/icone.js";
import { TESTI_PASSWORD as password, TESTI_RESET as testi } from "../../config/testi/accesso.js";
import { STILI_ACCESSO as stili } from "../../config/styles/accesso.js";
import { STILI_PASSWORD, COLORI_REGOLA } from "../../config/styles/password.js";
import CampoPassword from "./CampoPassword.jsx";
import RequisitiPassword from "./RequisitiPassword.jsx";

export default function ModuloReimpostaPassword({ modello }) {
  const { conferma, coincidono, invioInCorso, puoInviare, errore } = modello;
  return (
    <form onSubmit={modello.handleSubmit} noValidate className={stili.modulo}
      aria-busy={invioInCorso} aria-describedby={errore ? "esito-reset" : undefined}>
      <CampoPassword id="nuova-password" etichetta={password.nuova} autoComplete="new-password"
        value={modello.password} onChange={(e) => modello.setPassword(e.target.value)} descrizioneId="regole-password" />
      <RequisitiPassword password={modello.password} regoleRifiutate={modello.regoleRifiutate} />
      <div>
        <CampoPassword id="conferma-password" etichetta={password.conferma} autoComplete="new-password"
          value={conferma} onChange={(e) => modello.setConferma(e.target.value)}
          errore={conferma !== "" && !coincidono} descrizioneId="esito-conferma" />
        <p id="esito-conferma" className={`${STILI_PASSWORD.conferma} ${COLORI_REGOLA[coincidono ? "ok" : "ko"]}`}>
          {conferma !== "" && (coincidono ? password.coincidono : password.diverse)}
        </p>
      </div>
      <button type="submit" disabled={!puoInviare} className={stili.azione}>
        {invioInCorso && <LoaderCircle aria-hidden="true" className={stili.caricamento} />}
        {invioInCorso ? testi.salvataggio : testi.salva}
      </button>
    </form>
  );
}
