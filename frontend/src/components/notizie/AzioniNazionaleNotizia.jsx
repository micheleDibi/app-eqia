import { useState } from "react";
import { Link } from "react-router";
import DialogoConferma from "../shared/DialogoConferma.jsx";
import AlertMessage from "../AlertMessage.jsx";
import { Pencil, Trash2 } from "../../config/icone.js";
import { PERCORSI } from "../../config/routes/percorsi.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { TESTI_SCHEDA_NOTIZIA as testi } from "../../config/testi/notizie.js";
import { eliminaNotizia } from "../../lib/notizie.js";

export default function AzioniNazionale({ scheda, onEliminata }) {
  const [conferma, setConferma] = useState(false);
  const [errore, setErrore] = useState(null);
  const [occupato, setOccupato] = useState(false);
  const t = testi.confermaEliminazione;
  const elimina = async () => {
    setConferma(false);
    setOccupato(true);
    setErrore(null);
    try {
      await eliminaNotizia(scheda.notizia_id);
      onEliminata();
    } catch (e) {
      setErrore({ type: "error", text: e.message });
      setOccupato(false);
    }
  };
  return (
    <>
      {errore && <AlertMessage message={errore} separato={false} />}
      <Link to={PERCORSI.notizie.modifica(scheda.notizia_id)} className={pulsante("contornoPrimario")}>
        <Pencil aria-hidden="true" className="size-4" />{testi.modifica}
      </Link>
      <button type="button" className={pulsante("contorno")} disabled={occupato} onClick={() => setConferma(true)}>
        <Trash2 aria-hidden="true" className="size-4" />{testi.elimina}
      </button>
      <DialogoConferma aperto={conferma} titolo={t.titolo} messaggio={t.messaggio(scheda.notizia_titolo)}
        conferma={t.conferma} pericolo onConferma={elimina} onAnnulla={() => setConferma(false)} />
    </>
  );
}
