import { Link } from "react-router";
import { LoaderCircle } from "../config/icone.js";
import { useRichiestaRecupero } from "../hooks/useRichiestaRecupero.js";
import { ROTTE } from "../config/routes/rotte.js";
import { TESTI_ACCESSO, TESTI_RECUPERO as testi } from "../config/testi/accesso.js";
import { STILI_ACCESSO as stili } from "../config/styles/accesso.js";
import PaginaAccesso from "./accesso/PaginaAccesso.jsx";
import AlertMessage from "./AlertMessage.jsx";

export default function PasswordDimenticata() {
  const { email, setEmail, invioInCorso, inviato, handleSubmit } = useRichiestaRecupero();
  return (
    <PaginaAccesso titolo={testi.titolo} descrizione={!inviato ? testi.descrizione : undefined}>
      <AlertMessage message={inviato ? { type: "info", text: testi.esito } : null} separato={false} />
      {/* Il contratto esistente invia anche email malformate e mostra un esito uniforme. */}
      <form onSubmit={handleSubmit} noValidate className={stili.modulo} aria-busy={invioInCorso}>
        <div>
          <label htmlFor="email-recupero" className={stili.etichetta}>{testi.email}</label>
          <input id="email-recupero" name="email" type="email" autoComplete="email" required
            autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)}
            disabled={inviato || invioInCorso} className={stili.campo} aria-describedby="nota-recupero" />
        </div>
        <p id="nota-recupero" className={stili.nota}>{inviato ? testi.dopoInvio : testi.durata}</p>
        <button type="submit" disabled={inviato || invioInCorso} className={stili.azione}>
          {invioInCorso && <LoaderCircle aria-hidden="true" className={stili.caricamento} />}
          {invioInCorso ? testi.invioInCorso : inviato ? testi.inviato : testi.invia}
        </button>
        <div className={stili.ritorno}>
          <Link to={ROTTE.accesso} className={stili.collegamento}>{TESTI_ACCESSO.torna}</Link>
        </div>
      </form>
    </PaginaAccesso>
  );
}
