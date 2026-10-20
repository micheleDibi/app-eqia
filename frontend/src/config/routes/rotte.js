import { Building2, LayoutDashboard, Newspaper, Users, UserCog, FileText } from "../icone.js";
import identita from "../../../../shared/identita.json" with { type: "json" };
import { ruoloEquia } from "../ruoli.js";
import { ROTTE } from "./percorsi.js";

export { ROTTE, ROTTA_INIZIALE } from "./percorsi.js";
export const NOME_APPLICAZIONE = identita.nome;
export const VOCI_MENU = [
  { chiave: "dashboard", etichetta: "Dashboard", icona: LayoutDashboard },
  { chiave: "attuatori", etichetta: "Attuatori", icona: UserCog },
  { chiave: "sottoscrittori", etichetta: "Sottoscrittori", icona: Users },
  { chiave: "aziende", etichetta: "Centri", icona: Building2 },
  { chiave: "notizie", etichetta: "Notizie", icona: FileText },
  { chiave: "edunews24", etichetta: "EduNews", icona: Newspaper },
].map(voce => ({ ...voce, rotta: ROTTE[voce.chiave] }));

export function vociMenuPerRuolo(codice) {
  const ammesse = ruoloEquia(codice)?.menu ?? [];
  return VOCI_MENU.filter(voce => ammesse.includes(voce.chiave));
}
