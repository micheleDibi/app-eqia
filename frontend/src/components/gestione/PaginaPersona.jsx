import { useParams } from "react-router";
import useNavigazioneElenco from "../../hooks/useNavigazioneElenco.js";
import PaginaNonTrovata from "../PaginaNonTrovata.jsx";
import SchedaPersona from "./SchedaPersona.jsx";
import { idValido, PERCORSI } from "../../config/routes/percorsi.js";

export default function PaginaPersona({ tipo }) {
  const { clienteId } = useParams();
  const percorsi = PERCORSI[tipo === "attuatore" ? "attuatori" : "sottoscrittori"];
  const { apriCreato } = useNavigazioneElenco(percorsi.elenco);
  if (clienteId && !idValido(clienteId)) return <PaginaNonTrovata />;
  return <SchedaPersona key={`${tipo}-${clienteId ?? "nuovo"}`} id={clienteId} tipo={tipo} percorsi={percorsi}
    onCreato={r => apriCreato(`${percorsi.dettaglio(r.cliente_id)}?scheda=account`)} />;
}
