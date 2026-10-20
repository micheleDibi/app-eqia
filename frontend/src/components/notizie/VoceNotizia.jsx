import { Link } from "react-router";
import PallinoDaLeggere from "./PallinoDaLeggere.jsx";
import { PERCORSI } from "../../config/routes/percorsi.js";
import { pillola } from "../../config/styles/pillola.js";
import { STILI_NOTIZIE as stili } from "../../config/styles/notizie.js";
import { dataNotizia, sommarioNotizia } from "../../lib/notizie.js";

export default function VoceNotizia({ notizia }) {
  const sommario = sommarioNotizia(notizia);
  return (
    <Link to={PERCORSI.notizie.dettaglio(notizia.notizia_id)} className={stili.voce}>
      <span className={stili.testataVoce}>
        <span className={stili.pilloleVoce}>
          {notizia.tag_descrizione && <span className={pillola("primario")}>{notizia.tag_descrizione}</span>}
          {(notizia.sottotag ?? []).map((s) => (
            <span key={s.tag_dettaglio_id} className={pillola("neutro")}>{s.tag_dettaglio_descrizione}</span>
          ))}
        </span>
        <span>{dataNotizia(notizia.notizia_created_at)}</span>
      </span>
      <span className={stili.titoloVoce}><PallinoDaLeggere notizia={notizia} />{notizia.notizia_titolo}</span>
      {sommario && <span className={stili.sommarioVoce}>{sommario}</span>}
    </Link>
  );
}
