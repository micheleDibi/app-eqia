import { useId, useState } from "react";
import { Plus } from "../../config/icone.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { STILI_NOTIZIE as stili } from "../../config/styles/notizie.js";
import { TESTI_GESTIONE_TAG as testi } from "../../config/testi/notizie.js";

export default function NuovoNome({ etichetta, disattivo, piccolo = false, onAggiungi }) {
  const id = useId();
  const [nome, setNome] = useState("");
  const [errore, setErrore] = useState("");
  const aggiungi = async (evento) => {
    evento.preventDefault();
    if (!nome.trim()) { setErrore(testi.nomeVuoto); return; }
    setErrore("");
    if (await onAggiungi(nome.trim())) setNome("");
  };
  return (
    <form onSubmit={aggiungi} className={piccolo ? stili.nuovoSottotag : stili.nuovoTag} noValidate>
      <label htmlFor={id} className={piccolo ? "sr-only" : stili.etichettaNuovo}>{etichetta}</label>
      <div className={stili.rigaNuovo}>
        <input id={id} type="text" maxLength={255} value={nome} placeholder={piccolo ? etichetta : undefined}
          onChange={(e) => { setNome(e.target.value); setErrore(""); }} className={stili.campoNuovo}
          aria-invalid={Boolean(errore)} aria-describedby={errore ? `${id}-errore` : undefined} />
        <button type="submit" className={pulsante(piccolo ? "contorno" : "primario", "piccolo")} disabled={disattivo}>
          <Plus aria-hidden="true" className="size-4" />{testi.aggiungi}
        </button>
      </div>
      {errore && <p id={`${id}-errore`} className={stili.erroreNuovo}>{errore}</p>}
    </form>
  );
}
