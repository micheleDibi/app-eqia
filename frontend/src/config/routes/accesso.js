import { vociMenuPerRuolo, ROTTE } from "./rotte.js";
import { ruoloEquia } from "../ruoli.js";

export function paginaAmmessa(ruolo, percorso) {
  if (!ruoloEquia(ruolo)) return false;
  return [ROTTE.profilo, ...vociMenuPerRuolo(ruolo).map(v => v.rotta)]
    .some(base => percorso === base || percorso.startsWith(`${base}/`));
}
