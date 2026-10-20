import { useEffect, useState } from "react";
import { useSessione } from "../../hooks/useSessione.js";
import StatoCaricamentoDettaglio from "../shared/StatoCaricamentoDettaglio.jsx";
import PaginaNonTrovata from "../PaginaNonTrovata.jsx";
import { PERCORSI, ROTTE } from "../../config/routes/percorsi.js";
import { RUOLO_SCRIVE_NOTIZIE } from "../../config/testi/notizie.js";
import { leggiCategorie, leggiNotizia } from "../../lib/notizie.js";
import ModuloCompilato from "./CorpoModuloNotizia.jsx";

export default function Preparazione({ id }) {
  const scrive = useSessione()?.ruoloCodice === RUOLO_SCRIVE_NOTIZIE;
  const [stato, setStato] = useState({ pronto: false, errore: null, categorie: [], scheda: null });

  useEffect(() => {
    if (!scrive) return undefined;
    const controllo = new AbortController();
    Promise.all([leggiCategorie(controllo.signal), id === null ? null : leggiNotizia(id, controllo.signal)])
      .then(([categorie, scheda]) => setStato({ pronto: true, errore: null, categorie, scheda }))
      .catch((errore) => {
        if (!controllo.signal.aborted) setStato({ pronto: false, errore, categorie: [], scheda: null });
      });
    return () => controllo.abort();
  }, [id, scrive]);

  const ritorno = id === null ? ROTTE.notizie : PERCORSI.notizie.dettaglio(id);
  if (!scrive || stato.errore?.stato === 404 || (stato.scheda && !stato.scheda.modificabile)) {
    return <PaginaNonTrovata />;
  }
  if (!stato.pronto) {
    return <StatoCaricamentoDettaglio loading={!stato.errore} errore={stato.errore} ritorno={ritorno} />;
  }
  return <ModuloCompilato id={id} categorie={stato.categorie} scheda={stato.scheda} ritorno={ritorno} />;
}
