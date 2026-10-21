import { campo } from "../../config/styles/campo.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { pillola } from "../../config/styles/pillola.js";
import { notaRecapito, STILI_ANAGRAFICA as stili } from "../../config/styles/anagrafica.js";
import { TESTI_ACCOUNT as testi } from "../../config/testi/account.js";
import { dataVerifica, statoRecapito } from "../../lib/account.js";
import { Check } from "../../config/icone.js";

/**
 * Scheda di un recapito usato per l'accesso (email o cellulare): etichetta
 * con la pillola "Verificata" oppure il pulsante "Verifica", il valore e le
 * note (data della verifica, invito a salvare). Il valore si modifica nella
 * scheda anagrafica: con `onChange` il campo e' il suo (nome `tipo`),
 * altrimenti qui si legge soltanto.
 *
 * @param {{
 *   tipo: "email"|"cellulare",
 *   valore: string,
 *   verifica: { disponibile: boolean, stato?: object, apri: Function },
 *   onChange?: (evento: import("react").ChangeEvent<HTMLInputElement>) => void,
 * }} props
 */
export default function RecapitoAccount({ tipo, valore, verifica, onChange }) {
  const id = `account-${tipo}`;
  const { verificato, verificatoIl, mostraVerifica, verificaDisabilitata, daSalvare } =
    statoRecapito(verifica, valore);
  const conNote = Boolean(verificatoIl) || daSalvare;
  return (
    <div className={stili.schedaRecapito}>
      <div className={stili.testataRecapito}>
        <label htmlFor={id} className={stili.etichettaRecapito}>{testi[tipo]}</label>
        {verificato && (
          <span className={pillola("positivo")}>
            <Check aria-hidden="true" className={stili.spuntaRecapito} />
            {testi.verificato(tipo)}
          </span>
        )}
        {mostraVerifica && (
          <button type="button" disabled={verificaDisabilitata}
            className={`${pulsante("contorno", "minimo")} ${stili.pulsanteRecapito}`} onClick={verifica.apri}>
            {testi.verifica}
          </button>
        )}
      </div>
      {onChange ? (
        // Testo e non type="email": il formato lo controlla il server solo
        // se il valore cambia, un'email storica non blocca il salvataggio.
        <input id={id} name={tipo} type="text" inputMode={tipo === "email" ? "email" : "tel"} value={valore}
          onChange={onChange} autoComplete="off" className={campo("recapito")}
          aria-describedby={conNote ? `${id}-nota` : undefined} />
      ) : (
        <input id={id} type="text" readOnly value={valore || testi.vuoto} className={campo("recapito")}
          aria-describedby={conNote ? `${id}-nota` : undefined} />
      )}
      {conNote && (
        <div id={`${id}-nota`}>
          {verificatoIl && <p className={notaRecapito()}>{testi.verificatoIl(dataVerifica(verificatoIl))}</p>}
          {daSalvare && <p className={notaRecapito()}>{testi.daSalvare}</p>}
        </div>
      )}
    </div>
  );
}
