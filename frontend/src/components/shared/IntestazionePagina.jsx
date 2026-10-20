import { Link } from "react-router";
import { ArrowLeft } from "../../config/icone.js";
import {
  collegamentoIndietro,
  descrizionePagina,
  intestazionePagina,
  rigaIntestazionePagina,
  titoloPagina,
} from "../../config/styles/pagina";

/**
 * Intestazione di pagina: nelle pagine di dettaglio il collegamento di
 * ritorno all'elenco, poi il titolo con la descrizione sotto e le azioni a
 * destra. La descrizione puo' essere testo o piu' elementi in riga (nome,
 * codice fiscale, pillola dello stato).
 *
 * @param {{
 *   titolo: string,
 *   descrizione?: import("react").ReactNode,
 *   azioni?: import("react").ReactNode,
 *   indietro?: { rotta: string, etichetta: string },
 * }} props
 */
export default function IntestazionePagina({
  titolo,
  descrizione,
  azioni,
  indietro,
}) {
  return (
    <div className={intestazionePagina()}>
      {indietro && (
        <Link to={indietro.rotta} className={collegamentoIndietro()}>
          {/* 11px: con gap-1.5 il testo parte a 17px, come dopo il glifo del design. */}
          <ArrowLeft aria-hidden="true" className="size-2.75" />
          {indietro.etichetta}
        </Link>
      )}
      <div className={rigaIntestazionePagina()}>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className={titoloPagina()}>{titolo}</h1>
          {descrizione && <div className={descrizionePagina()}>{descrizione}</div>}
        </div>

        {azioni && (
          /* min-w-0: un'azione che sa andare a capo (il selettore delle sezioni)
             si restringe alla riga invece di sforare; i pulsanti non si
             comprimono comunque, il testo non va a capo. */
          <div className="flex min-w-0 flex-wrap items-center gap-2">{azioni}</div>
        )}
      </div>
    </div>
  );
}
