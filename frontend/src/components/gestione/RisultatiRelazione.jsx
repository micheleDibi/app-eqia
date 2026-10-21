import { useState } from "react";
import usePagineRemote from "../../hooks/usePagineRemote.js";
import StatoPagineElenco from "../shared/StatoPagineElenco.jsx";
import { API_GESTIONE as api } from "../../config/api/gestione.js";
import { estraiPaginaGestione } from "../../lib/gestione.js";
import { STILI_GESTIONE as stili } from "../../config/styles/gestione.js";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";
import { campo } from "../../config/styles/campo.js";
import { titoloSezioneModulo } from "../../config/styles/superficie.js";
import { pulsante } from "../../config/styles/pulsante.js";

export default function RisultatiRelazione({ tipo, titolo, onScegli, onChiudi }) {
  const [ricerca, setRicerca] = useState("");
  const endpoint = tipo === "centri" ? api.opzioniCentri : api.opzioniAttuatori;
  const pagina = usePagineRemote(`${endpoint}?limit=40&search=${encodeURIComponent(ricerca)}`, estraiPaginaGestione);
  return <div className={stili.dialogo}>
    <h2 className={titoloSezioneModulo()}>{titolo}</h2>
    <input type="search" aria-label={`${testi.cerca} ${titolo.toLowerCase()}`} placeholder={testi.cerca}
      className={campo("comodo")} value={ricerca} onChange={e => setRicerca(e.target.value)} data-focus-iniziale />
    <div className={stili.risultati}>
      {pagina.elementi.map(riga => <button key={riga.id} type="button" className={stili.opzione}
        onClick={() => onScegli({ ...riga, id: tipo === "padri" ? riga.utente_id : riga.id })}>{riga.label}</button>)}
      {!pagina.loading && !pagina.errore && !pagina.elementi.length && <p className={stili.testo}>{testi.risultatiVuoti}</p>}
    </div>
    <StatoPagineElenco pagina={pagina} />
    <div className={stili.azioni}>
      <button type="button" className={pulsante("testuale")} onClick={() => onScegli(null)}>{testi.rimuovi}</button>
      <button type="button" className={pulsante("secondario")} onClick={onChiudi}>{testi.chiudi}</button>
    </div>
  </div>;
}
