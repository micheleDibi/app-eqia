import { campo } from "./campo.js";

export const STILI_PASSWORD = {
  contenitore: "relative",
  visibilita: "absolute inset-y-0 right-1 my-auto inline-flex size-11 items-center justify-center rounded-controllo text-testo-tenue cursor-pointer transition-colors hover:text-primario focus:outline-none focus-visible:ring-2 focus-visible:ring-fuoco disabled:cursor-not-allowed",
  iconaVisibilita: "size-icona",
  capsLock: "mt-2 flex items-center gap-2 text-sm text-attenzione-forte",
  indicatore: "space-y-2",
  intestazione: "flex flex-wrap items-center justify-between gap-1 text-xs text-testo-tenue",
  segmenti: "flex gap-1",
  regole: "space-y-2",
  regola: "flex items-start gap-2 text-sm leading-relaxed",
  simbolo: "mt-1 size-icona-piccola shrink-0",
  nota: "block text-xs text-testo-tenue",
  conferma: "mt-2 min-h-5 text-sm",
};

export const COLORI_REGOLA = { ok: "text-positivo-forte", ko: "text-negativo-forte", neutro: "text-testo-tenue", non_verificabile: "text-testo-tenue" };
const LIVELLI = ["bg-negativo", "bg-negativo", "bg-attenzione", "bg-positivo", "bg-positivo"];

export function segmentoRobustezza(livello, indice) {
  return `h-1.5 flex-1 rounded-full ${indice < livello ? LIVELLI[livello] : "bg-superficie-alta"}`;
}

export function campoPassword(errore) {
  return `${campo("ampio", { errore })} pr-14`;
}
