const TONI = ["normale", "attenzione", "neutro"];
const FORME = ["colonna", "riga", "adattiva"];

/**
 * Targa bordata a -5,68 gradi: il dato chiave di una riga (scadenza, data di
 * pubblicazione, classe di concorso). La forma breve e' visibile e nascosta ai
 * lettori di schermo, che leggono `sr` ("Scadenza: 15 ottobre 2026").
 *
 * `forma`: "colonna" (cifra sopra, mese e anno sotto), "riga" ("15 ott 2026"
 * nella cifra compatta) o "adattiva" (riga sotto i 40rem del pannello della
 * pagina, colonna sopra). `etichetta` al posto delle cifre per un testo
 * ("Senza scadenza"). `tono` segue tonoTarga(stato).
 */
export default function Targa({ tono = "normale", forma = "colonna", cifra, mese, anno, etichetta, sr }) {
  return (
    <span className="edunews24-targa" data-tono={TONI.includes(tono) ? tono : "normale"}
      data-forma={FORME.includes(forma) ? forma : "colonna"}>
      <span className="edunews24-targa__corpo" aria-hidden={sr ? "true" : undefined}>
        {etichetta ? <span className="edunews24-targa__etichetta">{etichetta}</span> : (
          <>
            {cifra && <span className="edunews24-targa__cifra">{cifra}</span>}
            {mese && <span className="edunews24-targa__mese">{mese}</span>}
            {anno && <span className="edunews24-targa__anno">{anno}</span>}
          </>
        )}
      </span>
      {sr && <span className="sr-only">{sr}</span>}
    </span>
  );
}
