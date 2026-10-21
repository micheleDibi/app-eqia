import { campo as classiCampo } from "../../config/styles/campo.js";
import { STILI_AZIENDA as stili } from "../../config/styles/azienda.js";
import { TESTI_AZIENDA } from "../../config/testi/azienda.js";
import { OBBLIGATORI, PROPRIETA_CAMPI } from "../../config/campiAzienda.js";
import { pivaNonConforme } from "../../lib/azienda.js";
import CampoModulo from "../shared/CampoModulo.jsx";

const OBBLIGATORIO = new Set(OBBLIGATORI);

/**
 * I campi di una sezione della scheda del centro (`gruppo`: [nome, colonne
 * su 6]), dentro la griglia di SezioneModulo. Sotto la partita IVA, mentre
 * si scrive, l'avviso se non e' di 11 cifre.
 *
 * @param {{
 *   dati: Record<string, string>,
 *   onChange: (evento: Event) => void,
 *   soloLettura?: Record<string, boolean>,
 *   gruppo: [string, number][],
 * }} props
 *   soloLettura: campi bloccati oltre al codice nazionale (i dati anagrafici
 *   per chi non e' Nazionale).
 */
export default function CampiAzienda({ dati, onChange, soloLettura = {}, gruppo }) {
  return gruppo.map(([nome, colonne]) => {
    const proprieta = PROPRIETA_CAMPI[nome] ?? {};
    const obbligatorio = OBBLIGATORIO.has(nome);
    const avviso = nome === "azienda_partitaIVA" && pivaNonConforme(dati[nome]);
    const classi = classiCampo("comodo", { avviso, fuocoAvviso: "ambra" });
    return (
      <CampoModulo
        key={nome}
        per={nome}
        etichetta={TESTI_AZIENDA.campi[nome]}
        obbligatorio={obbligatorio}
        colonne={colonne}
        nota={avviso ? TESTI_AZIENDA.pivaNonConforme : undefined}
        tonoNota="avviso"
      >
        <input
          id={nome}
          name={nome}
          type="text"
          required={obbligatorio}
          readOnly={Boolean(proprieta.solaLettura || soloLettura[nome])}
          value={dati[nome]}
          onChange={onChange}
          placeholder={TESTI_AZIENDA.segnaposti[nome]}
          {...proprieta.input}
          aria-invalid={avviso || undefined}
          aria-describedby={avviso ? `${nome}-nota` : undefined}
          className={proprieta.monospazio ? `${classi} ${stili.monospazio}` : classi}
        />
      </CampoModulo>
    );
  });
}
