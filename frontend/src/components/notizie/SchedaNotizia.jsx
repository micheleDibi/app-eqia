import { useParams } from "react-router";
import PaginaNonTrovata from "../PaginaNonTrovata.jsx";
import { idValido } from "../../config/routes/percorsi.js";
import Scheda from "./ContenutoSchedaNotizia.jsx";

export default function SchedaNotizia() {
  const { notiziaId } = useParams();
  return idValido(notiziaId) ? <Scheda key={notiziaId} notiziaId={notiziaId} /> : <PaginaNonTrovata />;
}
