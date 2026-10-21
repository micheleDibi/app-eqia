import { pillola } from "../../config/styles/pillola.js";
import { STILI_NOTIZIE as stili } from "../../config/styles/notizie.js";
import { TESTI_SCHEDA_NOTIZIA as testi } from "../../config/testi/notizie.js";
import { useImmagineNotizia } from "../../hooks/useImmagineNotizia.js";
import { dataNotizia } from "../../lib/notizie.js";
import Allegati from "./AllegatiNotizia.jsx";

export default function Testata({ scheda }) {
  const url = useImmagineNotizia(scheda.notizia_id, scheda.immagine, scheda.notizia_updated_at);
  const pubblicata = dataNotizia(scheda.notizia_created_at);
  const aggiornata = dataNotizia(scheda.notizia_updated_at);
  return (
    <header className={url ? stili.testataConFoto : stili.testataSenzaFoto}>
      {url && <div className={stili.cornice}><img src={url} alt="" className={stili.immagine} /></div>}
      <div className={stili.colonnaInformazioni}>
        <div className={stili.informazioni}>
          <h1 className={stili.titoloNotizia}>{scheda.notizia_titolo}</h1>
          <div className={stili.pilloleScheda}>
            {scheda.tag_descrizione && <span className={pillola("primario")}>{scheda.tag_descrizione}</span>}
            {scheda.sottotag.map((s) => (
              <span key={s.tag_dettaglio_id} className={pillola("neutro")}>{s.tag_dettaglio_descrizione}</span>
            ))}
          </div>
          {scheda.notizia_sottotitolo && <p className={stili.sottotitolo}>{scheda.notizia_sottotitolo}</p>}
          <p className={stili.datiNotizia}>
            {pubblicata && <span>{testi.pubblicata(pubblicata)}</span>}
            {aggiornata && aggiornata !== pubblicata && <span>{testi.aggiornata(aggiornata)}</span>}
          </p>
        </div>
        {scheda.allegati.length > 0 && <Allegati scheda={scheda} />}
      </div>
    </header>
  );
}
