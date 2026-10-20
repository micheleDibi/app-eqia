import catalogo from "../../../shared/ruoli.json" with { type: "json" };

export const RUOLI = Object.freeze(catalogo);
export const ruoloEquia = codice => RUOLI.find(r => r.codice === codice);
export const nomeRuolo = codice => ruoloEquia(codice)?.nome ?? codice;
export const ruoliAssegnabili = codice => ruoloEquia(codice)?.assegna ?? [];
