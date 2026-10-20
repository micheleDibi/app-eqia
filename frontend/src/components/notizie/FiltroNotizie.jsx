import { Check, ChevronDown, ChevronRight } from "../../config/icone.js";
import { STILI_NOTIZIE as stili } from "../../config/styles/notizie.js";
import { TESTI_NOTIZIE as testi } from "../../config/testi/notizie.js";
import { filtroConSottotag } from "../../lib/notizie.js";

export default function SceltaFiltro({ categorie, filtri, onScegli }) {
  const scegli = (evento, valori, chiudi) => {
    onScegli(valori);
    if (chiudi) evento.currentTarget.closest("[popover]")?.hidePopover();
  };
  const voce = (etichetta, scelta, valori, { chiudi = true, aperta } = {}) => {
    const Freccia = aperta ? ChevronDown : ChevronRight;
    return (
      <button type="button" aria-pressed={scelta} aria-expanded={aperta}
        onClick={(e) => scegli(e, valori, chiudi)} className={scelta ? stili.voceFiltroScelta : stili.voceFiltro}>
        <span className={stili.nomeVoceFiltro}>
          {etichetta}
          {aperta !== undefined && <Freccia aria-hidden="true" className={stili.frecciaFiltro} />}
        </span>
        {scelta && <Check aria-hidden="true" className={stili.spuntaFiltro} />}
      </button>
    );
  };
  return (
    <ul role="list" aria-label={testi.sceltaFiltro} className={stili.vociFiltro}>
      <li>{voce(testi.tutteLeNotizie, !filtri.tag, { tag: "", sottotag: [] })}</li>
      {categorie.map((c) => {
        const tag = String(c.tag_id);
        const conArgomenti = c.sottotag.length > 0;
        const aperta = conArgomenti ? filtri.tag === tag : undefined;
        return (
          <li key={tag}>
            {voce(c.tag_descrizione, filtri.tag === tag && filtri.sottotag.length === 0, { tag, sottotag: [] },
              { chiudi: !conArgomenti, aperta })}
            {aperta && (
              <ul role="list" className={stili.argomentiFiltro}>
                {c.sottotag.map((s) => {
                  const sottotag = String(s.tag_dettaglio_id);
                  return (
                    <li key={sottotag}>
                      {voce(s.tag_dettaglio_descrizione, filtri.sottotag.includes(sottotag),
                        filtroConSottotag(filtri, c, sottotag), { chiudi: false })}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
