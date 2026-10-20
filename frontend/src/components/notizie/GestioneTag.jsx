import { useEffect, useState } from "react";
import Dialogo from "../shared/Dialogo.jsx";
import AlertMessage from "../AlertMessage.jsx";
import { X } from "../../config/icone.js";
import { pillola } from "../../config/styles/pillola.js";
import { STILI_NOTIZIE as stili } from "../../config/styles/notizie.js";
import { TESTI_GESTIONE_TAG as testi } from "../../config/testi/notizie.js";
import { aggiungiSottotag, aggiungiTag, leggiTag, statoSottotag, statoTag } from "../../lib/notizie.js";
import Interruttore from "./StatoTag.jsx";
import NuovoNome from "./NuovoNomeTag.jsx";

export default function GestioneTag({ onChiudi }) {
  const [tag, setTag] = useState(null);
  const [messaggio, setMessaggio] = useState(null);
  const [occupato, setOccupato] = useState(false);
  const [cambiati, setCambiati] = useState(false);

  useEffect(() => {
    const controllo = new AbortController();
    leggiTag(controllo.signal)
      .then((elenco) => { if (!controllo.signal.aborted) setTag(elenco); })
      .catch((e) => { if (!controllo.signal.aborted) setMessaggio({ type: "error", text: e.message }); });
    return () => controllo.abort();
  }, []);

  /** Esegue una modifica; true se e' andata, per svuotare il campo del nome. */
  const esegui = async (azione) => {
    setOccupato(true);
    setMessaggio(null);
    try {
      setTag(await azione());
      setCambiati(true);
      return true;
    } catch (e) {
      setMessaggio({ type: "error", text: e.message });
      return false;
    } finally {
      setOccupato(false);
    }
  };
  const chiudi = () => onChiudi(cambiati);

  return (
    <Dialogo aperto onChiudi={chiudi} etichetta={testi.titolo} variante="scelta">
      <div className={stili.testataFinestra}>
        <h2 className={stili.titoloFinestra}>{testi.titolo}</h2>
        <button type="button" onClick={chiudi} className={stili.chiudiFinestra} aria-label={testi.chiudi}>
          <X aria-hidden="true" className={stili.iconaChiudiFinestra} />
        </button>
      </div>
      <div className={stili.corpoTag}>
        <p className={stili.descrizioneTag}>{testi.descrizione}</p>
        {messaggio && <AlertMessage message={messaggio} separato={false} />}
        <NuovoNome etichetta={testi.nuovoTag} disattivo={occupato || !tag}
          onAggiungi={(nome) => esegui(() => aggiungiTag(nome))} />
        {!tag && !messaggio && <p role="status" className={stili.descrizioneTag}>{testi.caricamento}</p>}
        {tag && (
          <ul role="list" className={stili.elencoTag}>
            {tag.map((principale) => (
              <li key={principale.tag_id} className={stili.voceTag}>
                <div className={stili.testataTag}>
                  <span className={principale.attivo ? stili.nomeTag : stili.nomeTagSpento}>
                    {principale.tag_descrizione}
                  </span>
                  {!principale.attivo && <span className={pillola("neutro")}>{testi.disattivata}</span>}
                  <Interruttore attivo={principale.attivo} nome={principale.tag_descrizione} disattivo={occupato}
                    onCambia={(attivo) => esegui(() => statoTag(principale.tag_id, attivo))} />
                </div>
                {principale.sottotag.length > 0 ? (
                  <ul role="list" className={stili.elencoSottotag}>
                    {principale.sottotag.map((s) => (
                      <li key={s.tag_dettaglio_id} className={stili.voceSottotag}>
                        <span className={s.attivo ? stili.nomeSottotag : stili.nomeSottotagSpento}>
                          {s.tag_dettaglio_descrizione}
                        </span>
                        {!s.attivo && <span className={pillola("neutro")}>{testi.disattivato}</span>}
                        <Interruttore attivo={s.attivo} nome={s.tag_dettaglio_descrizione} disattivo={occupato}
                          onCambia={(attivo) => esegui(() => statoSottotag(s.tag_dettaglio_id, attivo))} />
                      </li>
                    ))}
                  </ul>
                ) : <p className={stili.nessunSottotag}>{testi.nessunSottotag}</p>}
                <NuovoNome etichetta={testi.nuovoSottotag(principale.tag_descrizione)} disattivo={occupato} piccolo
                  onAggiungi={(nome) => esegui(() => aggiungiSottotag(principale.tag_id, nome))} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialogo>
  );
}
