import { History } from "../../config/icone.js";
import { descriviAggiornamento } from "../../lib/edunews24.js";

/**
 * Folio dell'aggiornamento, sempre presente (vuoto finche' non c'e' nulla da
 * dire): "Aggiornato alle hh:mm"; con la copia stantia l'icona History, "Non
 * aggiornato dalle..." e la frase completa per i lettori di schermo; dopo un
 * primo caricamento fallito, senza copia, "Contenuti non aggiornati"
 * (`errore`). Nel modulo sta nella riga del selettore, nella pagina nella
 * testata.
 */
export default function FolioEduNews24({ aggiornatoIl, stantio = false, errore = false, adesso, className = "" }) {
  const folio = descriviAggiornamento(aggiornatoIl, stantio, adesso, errore);
  const vecchio = folio !== null && stantio;
  return (
    <p className={["edunews24-folio", className].filter(Boolean).join(" ")} data-stantio={vecchio ? "si" : "no"}>
      {vecchio && <History aria-hidden="true" className="edunews24-folio__icona" />}
      {folio && (folio.iso ? <time dateTime={folio.iso}>{folio.testo}</time> : <span>{folio.testo}</span>)}
      {folio?.esteso && <span className="sr-only">{folio.esteso}</span>}
    </p>
  );
}
