import useNavigazioneElenco from "../../hooks/useNavigazioneElenco.js";
import SchedaPersona from "./SchedaPersona.jsx";
import { PERCORSI } from "../../config/routes/percorsi.js";

export default function PaginaPersona({ tipo }) {
  const percorsi = PERCORSI[tipo === "attuatore" ? "attuatori" : "sottoscrittori"];
  const { apriCreato } = useNavigazioneElenco(percorsi.elenco);
  return <SchedaPersona key={tipo} tipo={tipo} percorsi={percorsi}
    onCreato={r => apriCreato(percorsi.dettaglio(r.cliente_id))} />;
}
