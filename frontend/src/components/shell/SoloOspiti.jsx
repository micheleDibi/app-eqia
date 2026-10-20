import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { sessioneEsistente } from "../../lib/accesso.js";
import { haSessione } from "../../lib/sessione.js";
import { destinazioneDopoAccesso } from "../../lib/ritornoAccesso.js";
import { ROTTA_INIZIALE } from "../../config/routes/percorsi.js";
import { STILI_ACCESSO as stili } from "../../config/styles/accesso.js";
import { TESTI_ACCESSO as testi } from "../../config/testi/accesso.js";
import PaginaAccesso from "../accesso/PaginaAccesso.jsx";

/**
 * Gemello di RichiediSessione per la pagina di accesso: chi ha gia' una
 * sessione valida non deve rivedere il form, viene portato dentro. Finche'
 * il server non risponde si mostra la stessa attesa delle pagine interne,
 * cosi' il form non lampeggia a chi e' gia' autenticato.
 */
export default function SoloOspiti({ children }) {
  const navigate = useNavigate();
  const [stato, setStato] = useState(() => (haSessione() ? "autenticato" : "verifica"));

  useEffect(() => {
    if (stato !== "verifica") return undefined;
    let attivo = true;
    sessioneEsistente().then((valida) => {
      if (attivo) setStato(valida ? "autenticato" : "ospite");
    });
    return () => { attivo = false; };
  }, [stato]);

  useEffect(() => {
    if (stato === "autenticato") navigate(destinazioneDopoAccesso(ROTTA_INIZIALE), { replace: true });
  }, [stato, navigate]);

  if (stato === "ospite") return children;
  return (
    <PaginaAccesso titolo={testi.verificaSessione}>
      <p role="status" className={stili.stato}>{testi.verificaInCorso}</p>
    </PaginaAccesso>
  );
}
