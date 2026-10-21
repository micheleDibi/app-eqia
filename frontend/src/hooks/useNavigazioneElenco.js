import { useLocation, useNavigate } from "react-router";

/** Conserva ricerca e filtri anche dopo il passaggio da creazione a scheda.
 * `stato` serve ai Link; `altre` ammette ulteriori pagine di provenienza. */
export default function useNavigazioneElenco(elenco, altre = []) {
  const location = useLocation();
  const navigate = useNavigate();
  const precedente = location.state?.elenco;
  const ammessa = (pagina) => precedente === pagina || precedente.startsWith(`${pagina}?`);
  const ritorno = typeof precedente === "string" && [elenco, ...altre].some(ammessa) ? precedente : elenco;
  const stato = { elenco: location.pathname + location.search };
  const apri = percorso => navigate(percorso, { state: stato });
  const apriCreato = percorso => navigate(percorso, { replace: true, state: { elenco: ritorno } });
  return { apri, apriCreato, ritorno, stato };
}
