import useNavigazioneElenco from "../../hooks/useNavigazioneElenco.js";
import { PERCORSI } from "../../config/routes/percorsi.js";
import SchedaCentro from "./SchedaCentro.jsx";

export default function PaginaCentro() {
  const { apriCreato } = useNavigazioneElenco(PERCORSI.aziende.elenco);
  return <SchedaCentro
    onCreato={r => apriCreato(PERCORSI.aziende.dettaglio(r.azienda_id))} />;
}
