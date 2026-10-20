import { Link } from "react-router";
import { LoaderCircle } from "../config/icone.js";
import { useReimpostaPassword } from "../hooks/useReimpostaPassword.js";
import { ROTTE } from "../config/routes/rotte.js";
import { TESTI_ACCESSO, TESTI_RESET as testi } from "../config/testi/accesso.js";
import { STILI_ACCESSO as stili } from "../config/styles/accesso.js";
import PaginaAccesso from "./accesso/PaginaAccesso.jsx";
import ModuloReimpostaPassword from "./accesso/ModuloReimpostaPassword.jsx";
import AlertMessage from "./AlertMessage.jsx";

export default function ReimpostaPassword() {
  const modello = useReimpostaPassword();
  const { stato, motivo, errore } = modello;
  if (stato === "verifica") return (
    <PaginaAccesso titolo={testi.titolo}>
      <p role="status" className={stili.stato}>
        <LoaderCircle aria-hidden="true" className={stili.caricamento} />{testi.verifica}
      </p>
    </PaginaAccesso>
  );
  // Il modulo non viene montato senza una verifica valida del link.
  if (stato === "non_valido") return (
    <PaginaAccesso titolo={testi.linkNonValido}>
      <AlertMessage message={{ type: "error", text: testi.motivi[motivo] ?? testi.motivi.non_valido }} separato={false} />
      <p className={stili.nota}>{testi.istruzioniLink}</p>
      <Link to={ROTTE.recuperoPassword} className={stili.azione}>{testi.nuovoLink}</Link>
      <div className={stili.ritorno}><Link to={ROTTE.accesso} className={stili.collegamento}>{TESTI_ACCESSO.torna}</Link></div>
    </PaginaAccesso>
  );
  return (
    <PaginaAccesso titolo={testi.titolo} descrizione={testi.descrizione}>
      <AlertMessage id="esito-reset" message={errore ? { type: "error", text: errore } : null} separato={false} />
      <ModuloReimpostaPassword modello={modello} />
      <div className={stili.ritorno}><Link to={ROTTE.accesso} className={stili.collegamento}>{TESTI_ACCESSO.torna}</Link></div>
    </PaginaAccesso>
  );
}
