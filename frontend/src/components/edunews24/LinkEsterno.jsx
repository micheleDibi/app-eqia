import { ExternalLink } from "../../config/icone.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";

/**
 * Unico link esterno della sezione: si apre in una nuova scheda senza
 * passare riferimenti, con l'icona (nascosta ai lettori di schermo) e il
 * testo "(si apre in una nuova scheda)". L'icona sta dentro il link ma fuori
 * dai figli, cosi' un titolo troncato non la taglia.
 *
 * Con `nascosto` e' il link gemello di un riquadro gia' raggiungibile dal
 * titolo: fuori dal tab order e dall'albero dell'accessibilita', senza icona.
 * `descrizione`: id del testo che spiega il link (aria-describedby).
 */
export default function LinkEsterno({ href, className, children, rif, nascosto = false, descrizione }) {
  if (nascosto) {
    return (
      <a ref={rif} href={href} className={className} target="_blank" rel="noopener noreferrer"
        tabIndex={-1} aria-hidden="true">
        {children}
      </a>
    );
  }
  return (
    <a ref={rif} href={href} className={className} target="_blank" rel="noopener noreferrer"
      aria-describedby={descrizione}>
      {children}
      <ExternalLink aria-hidden="true" className="edunews24-esterno" />
      <span className="sr-only">{testi.nuovaScheda}</span>
    </a>
  );
}
