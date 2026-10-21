import { useEffect, useState } from "react";
import CampoModulo from "../shared/CampoModulo.jsx";
import SceltaRelazione from "./SceltaRelazione.jsx";
import { RUOLI } from "../../config/ruoli.js";
import { campo } from "../../config/styles/campo.js";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";
import { nomeCentro } from "../../lib/gestione.js";

export default function FiltriGestione({ tipo, query, aggiorna }) {
  const [centro, setCentro] = useState(null);
  useEffect(() => {
    if (!query.centro) return undefined;
    const controller = new AbortController();
    nomeCentro(query.centro, controller.signal).then(label => {
      if (!controller.signal.aborted) setCentro({ id: query.centro, label });
    }).catch(() => {});
    return () => controller.abort();
  }, [query.centro]);
  return <>
    {tipo === "attuatore" && <CampoModulo per="filtro-ruolo" etichetta={testi.ruolo}>
      <select id="filtro-ruolo" className={campo("comodo")} value={query.ruolo} onChange={e => aggiorna({ ruolo: e.target.value })}>
        <option value="" data-senza-filtro>{testi.tuttiRuoli}</option>
        {RUOLI.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
      </select>
    </CampoModulo>}
    <CampoModulo per="filtro-centro" etichetta={testi.centroLabel}>
      <SceltaRelazione id="filtro-centro" tipo="centri" etichetta={testi.centroLabel} valore={query.centro}
        nome={centro?.id === query.centro ? centro.label : undefined}
        onChange={r => { setCentro(r ? { ...r, id: String(r.id) } : null); aggiorna({ centro: r?.id ? String(r.id) : "" }); }} />
    </CampoModulo>
  </>;
}
