import { useParams } from "react-router";
import PaginaNonTrovata from "../PaginaNonTrovata.jsx";
import { idValido } from "../../config/routes/percorsi.js";
import Preparazione from "./PreparazioneModuloNotizia.jsx";

export default function ModuloNotizia() {
  const { notiziaId } = useParams();
  if (notiziaId !== undefined && !idValido(notiziaId)) return <PaginaNonTrovata />;
  const id = notiziaId === undefined ? null : Number(notiziaId);
  return <Preparazione key={id ?? "nuova"} id={id} />;
}
