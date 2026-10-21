import SezioneAccount from "../account/SezioneAccount.jsx";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import CampoModulo from "../shared/CampoModulo.jsx";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";
import { STILI_GESTIONE as stili } from "../../config/styles/gestione.js";

export default function AccountPersona({ id, form }) {
  if (!id) return <SezioneModulo titolo={testi.account} griglia={false}><p className={stili.testo}>{testi.salvaPrima}</p></SezioneModulo>;
  return <>
    <SezioneModulo titolo={testi.identificativi}>
      <CampoModulo per="username" etichetta={testi.username}><p id="username" className={stili.valore}>{form.salvati.username}</p></CampoModulo>
      <CampoModulo per="codice" etichetta={testi.codice}><p id="codice" className={stili.valore}>{form.salvati.cliente_codice}</p></CampoModulo>
    </SezioneModulo>
    {form.salvati.permessi.modifica && <SezioneAccount key={`${id}-${form.salvati.cliente_email}-${form.salvati.cliente_cellulare}`}
      clienteId={Number(id)} valori={{ email: form.dati.cliente_email, cellulare: form.dati.cliente_cellulare }}
      permessi={form.salvati.permessi} />}
  </>;
}
