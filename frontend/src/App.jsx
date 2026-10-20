import { BrowserRouter, Route, Routes } from "react-router";
import Login from "./components/Login.jsx";
import PasswordDimenticata from "./components/PasswordDimenticata.jsx";
import ReimpostaPassword from "./components/ReimpostaPassword.jsx";
import GuscioApplicazione from "./components/shell/GuscioApplicazione.jsx";
import RichiediSessione from "./components/shell/RichiediSessione.jsx";
import SoloOspiti from "./components/shell/SoloOspiti.jsx";
import MioProfilo from "./components/MioProfilo.jsx";
import PaginaEduNews24 from "./components/edunews24/PaginaEduNews24.jsx";
import PaginaNonTrovata from "./components/PaginaNonTrovata.jsx";
import SezioneBase from "./components/SezioneBase.jsx";
import PaginaNotizie from "./components/notizie/PaginaNotizie.jsx";
import SchedaNotizia from "./components/notizie/SchedaNotizia.jsx";
import ModuloNotizia from "./components/notizie/ModuloNotizia.jsx";
import { PERCORSI } from "./config/routes/percorsi.js";
import { ROTTE, VOCI_MENU } from "./config/routes/rotte.js";

const PAGINE_SEZIONE = { notizie: PaginaNotizie };

export default function App() {
  return <BrowserRouter><Routes>
    <Route path={ROTTE.accesso} element={<SoloOspiti><Login /></SoloOspiti>} />
    <Route path={ROTTE.recuperoPassword} element={<PasswordDimenticata />} />
    <Route path={ROTTE.reimpostaPassword} element={<ReimpostaPassword />} />
    <Route element={<RichiediSessione><GuscioApplicazione /></RichiediSessione>}>
      <Route path={ROTTE.profilo} element={<MioProfilo />} />
      <Route path={ROTTE.edunews24} element={<PaginaEduNews24 />} />
      {/* Le notizie: "Nuova notizia", scheda e modifica, accanto all'elenco. */}
      <Route path={PERCORSI.notizie.nuovo} element={<ModuloNotizia />} />
      <Route path={PERCORSI.notizie.modello} element={<SchedaNotizia />} />
      <Route path={PERCORSI.notizie.modificaModello} element={<ModuloNotizia />} />
      {VOCI_MENU.filter(v => v.chiave !== "edunews24").map(v => {
        const Pagina = PAGINE_SEZIONE[v.chiave] ?? SezioneBase;
        return <Route key={v.chiave} path={v.rotta} element={<Pagina titolo={v.etichetta} />} />;
      })}
    </Route>
    <Route path="*" element={<PaginaNonTrovata />} />
  </Routes></BrowserRouter>;
}
