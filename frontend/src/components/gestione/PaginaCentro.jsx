import { useParams } from "react-router";
import useNavigazioneElenco from "../../hooks/useNavigazioneElenco.js";
import { idValido, PERCORSI } from "../../config/routes/percorsi.js";
import PaginaNonTrovata from "../PaginaNonTrovata.jsx";
import SchedaCentro from "./SchedaCentro.jsx";

export default function PaginaCentro() {
  const { aziendaId } = useParams();
  const { apriCreato } = useNavigazioneElenco(PERCORSI.aziende.elenco);
  if (aziendaId && !idValido(aziendaId)) return <PaginaNonTrovata />;
  return <SchedaCentro key={aziendaId ?? "nuovo"} id={aziendaId}
    onCreato={r => apriCreato(PERCORSI.aziende.dettaglio(r.azienda_id))} />;
}
