import { Link } from "react-router";
import { LoaderCircle } from "../config/icone.js";
import { useAccesso } from "../hooks/useAccesso.js";
import { useContestoAccesso } from "../hooks/useContestoAccesso.js";
import { ROTTE } from "../config/routes/rotte.js";
import { TESTI_ACCESSO as testi } from "../config/testi/accesso.js";
import { STILI_ACCESSO as stili } from "../config/styles/accesso.js";
import PaginaAccesso from "./accesso/PaginaAccesso.jsx";
import CampoPassword from "./accesso/CampoPassword.jsx";
import AlertMessage from "./AlertMessage.jsx";
import PassoSecondoFattore from "./accesso/PassoSecondoFattore.jsx";

export default function Login() {
  const { username, setUsername, password, setPassword, error, avviso, loading, attesa, limiteRaggiunto, handleSubmit, sfida, setSfida, completa } = useAccesso();
  const contesto = useContestoAccesso();
  const messaggio = limiteRaggiunto
    ? { type: attesa > 0 ? "warning" : "info", text: attesa > 0 ? error : testi.attesaTerminata }
    : error ? { type: "error", text: error } : avviso ? { type: "warning", text: avviso } : null;
  if (sfida) {
    // Il server dice quale passo e': il metodo proposto, o la verifica dell'email.
    const passo = testi.passi[sfida.metodo] ?? testi.passi.email;
    return <PaginaAccesso titolo={passo.titolo} descrizione={passo.descrizione}>
      <PassoSecondoFattore sfida={sfida} onCambia={setSfida} onVerificato={completa} onAnnulla={() => setSfida(null)} />
    </PaginaAccesso>;
  }
  return (
    <PaginaAccesso titolo={testi.titolo} descrizione={testi.descrizione}>
      {contesto && <p role="status" className={stili.contesto}>{contesto}</p>}
      <AlertMessage id="esito-accesso" message={messaggio} separato={false} />
      <form onSubmit={handleSubmit} className={stili.modulo} aria-busy={loading}
        aria-describedby={messaggio ? "esito-accesso" : undefined}>
        <div>
          <label htmlFor="username" className={stili.etichetta}>{testi.username}</label>
          <input id="username" name="username" type="text" autoComplete="username"
            autoCapitalize="none" spellCheck={false} required value={username}
            onChange={(e) => setUsername(e.target.value)} className={stili.campo} />
        </div>
        <CampoPassword id="password" etichetta={testi.password} autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" disabled={loading || attesa > 0} className={stili.azione}>
          {loading && <LoaderCircle aria-hidden="true" className={stili.caricamento} />}
          {loading ? testi.accessoInCorso : testi.entra}
        </button>
        {attesa > 0 && <p className={stili.attesa} role="timer" aria-live="off">{testi.attesa(attesa)}</p>}
        <div className={stili.ritorno}>
          <Link to={ROTTE.recuperoPassword} className={stili.collegamento}>{testi.recupera}</Link>
        </div>
      </form>
    </PaginaAccesso>
  );
}
