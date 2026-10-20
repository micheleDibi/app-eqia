import { TriangleAlert } from "../../config/icone.js";
import { STILI_EDUNEWS24 } from "../../config/styles/edunews24.js";

/**
 * Nota "Da verificare" di un bando (daVerificareBando: { motivo, etichetta,
 * testo }), nel tono attenzione con l'icona TriangleAlert, mai il solo colore.
 * - "distintivo": il distintivo "Da verificare" accanto a quello di stato. Con
 *   `id` la frase sta in un nodo hidden, letta solo come descrizione del link
 *   del titolo (LinkEsterno `descrizione`): nel modulo si vede solo il
 *   distintivo, e la frase non si sente due volte.
 * - "esteso": la frase visibile, con l'`id` che il link del titolo usa come
 *   descrizione.
 * Senza nota non compare.
 */
export default function NotaDaVerificare({ nota, variante = "distintivo", id }) {
  if (!nota) return null;
  if (variante === "esteso") {
    return (
      <p id={id} className={["edunews24-nota-verifica", STILI_EDUNEWS24.notaVerifica].join(" ")}>
        <TriangleAlert aria-hidden="true" className="edunews24-nota-verifica__icona" />
        <span>{nota.testo}</span>
      </p>
    );
  }
  return (
    <>
      <span className="edunews24-distintivo" data-tono="attenzione" data-chiave="da-verificare">
        <TriangleAlert aria-hidden="true" className="edunews24-distintivo__icona" />
        {nota.etichetta}
      </span>
      {id && <span id={id} hidden>{nota.testo}</span>}
    </>
  );
}
