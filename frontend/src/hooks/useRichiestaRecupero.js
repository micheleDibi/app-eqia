import { useRef, useState } from "react";
import { richiediRecupero } from "../lib/recuperoPassword.js";

export function useRichiestaRecupero() {
  const [email, setEmail] = useState("");
  const [invioInCorso, setInvioInCorso] = useState(false);
  const [inviato, setInviato] = useState(false);
  const invio = useRef(false);
  const handleSubmit = async (evento) => {
    evento.preventDefault();
    if (inviato || invio.current) return;
    invio.current = true;
    setInvioInCorso(true);
    await richiediRecupero(email);
    setInviato(true);
    setInvioInCorso(false);
  };
  return { email, setEmail, invioInCorso, inviato, handleSubmit };
}
