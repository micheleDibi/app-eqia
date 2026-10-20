import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { leggiTokenDallUrl, ripulisciUrlDalToken } from "../lib/resetToken.js";
import { verificaLinkReset, confermaReset } from "../lib/recuperoPassword.js";
import { valutaPassword } from "../lib/passwordPolicy.js";
import { ROTTE } from "../config/routes/rotte.js";

function useLinkReset() {
  const [token] = useState(leggiTokenDallUrl);
  const [verifica, setVerifica] = useState(() => ({ stato: token ? "verifica" : "non_valido", motivo: "non_valido" }));
  useEffect(() => {
    ripulisciUrlDalToken();
    if (!token) return;
    let annullato = false;
    verificaLinkReset(token).then((esito) => { if (!annullato) setVerifica(esito); });
    return () => { annullato = true; };
  }, [token]);
  return { token, ...verifica };
}

export function useReimpostaPassword() {
  const { token, stato, motivo } = useLinkReset();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [conferma, setConferma] = useState("");
  const [invioInCorso, setInvioInCorso] = useState(false);
  const [esito, setEsito] = useState(null);
  const invio = useRef(false);
  const coincidono = conferma !== "" && password === conferma;
  const puoInviare = stato === "valido" && valutaPassword(password).valida && coincidono && !invioInCorso;

  const handleSubmit = async (evento) => {
    evento.preventDefault();
    if (!puoInviare || invio.current) return;
    invio.current = true;
    setEsito(null);
    setInvioInCorso(true);
    const risultato = await confermaReset({ token, password, conferma });
    if (risultato.ok) {
      navigate(ROTTE.accesso, { replace: true, state: { passwordAggiornata: true } });
      return;
    }
    setEsito(risultato);
    setInvioInCorso(false);
    invio.current = false;
  };

  return { stato, motivo, password, setPassword, conferma, setConferma, invioInCorso,
    errore: esito?.errore, regoleRifiutate: esito?.regoleRifiutate ?? [], coincidono, puoInviare, handleSubmit };
}
