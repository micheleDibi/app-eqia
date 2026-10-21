import CampoModulo from "../shared/CampoModulo.jsx";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import SceltaRelazione from "./SceltaRelazione.jsx";
import { RUOLI, ruoliAssegnabili } from "../../config/ruoli.js";
import { campo } from "../../config/styles/campo.js";
import { TESTI_GESTIONE as testi } from "../../config/testi/gestione.js";

export default function RelazioniPersona({ tipo, form, ruolo, disabilitato }) {
  const assegna = ruoliAssegnabili(ruolo);
  const ruoli = RUOLI.filter(r => assegna.includes(r.codice) || r.id === form.dati.cliente_ruolo);
  const cambia = (chiave, nome) => riga => form.setDati(dati => ({ ...dati, [chiave]: riga?.id ?? null, [nome]: riga?.label ?? null }));
  return <SezioneModulo titolo={testi.relazioni}>
    {tipo === "attuatore" && <CampoModulo per="cliente_ruolo" etichetta={testi.ruolo} obbligatorio>
      <select id="cliente_ruolo" name="cliente_ruolo" className={campo("comodo")} value={form.dati.cliente_ruolo ?? ""}
        onChange={form.cambia} disabled={disabilitato || !assegna.length || form.salvati?.permessi.ruolo === false} required>
        <option value="" data-segnaposto>{testi.scegli}</option>
        {ruoli.map(r => <option key={r.id} value={r.id} disabled={!assegna.includes(r.codice)}>{r.nome}</option>)}
      </select>
    </CampoModulo>}
    <CampoModulo per="centro-relazione" etichetta={testi.centroLabel}>
      <SceltaRelazione id="centro-relazione" etichetta={testi.centroLabel} tipo="centri" valore={form.dati.azienda_id} nome={form.dati.centro_nome}
        onChange={cambia("azienda_id", "centro_nome")} disabilitato={disabilitato} />
    </CampoModulo>
    {tipo === "sottoscrittore" && <CampoModulo per="attuatore-relazione" etichetta={testi.referente}>
      <SceltaRelazione id="attuatore-relazione" etichetta={testi.referente} tipo="attuatori" valore={form.dati.attuatore_id} nome={form.dati.attuatore_nome}
        onChange={cambia("attuatore_id", "attuatore_nome")} disabilitato={disabilitato} />
    </CampoModulo>}
    {ruolo === "nazionale" && <CampoModulo per="padre-relazione" etichetta={testi.padre}>
      <SceltaRelazione id="padre-relazione" etichetta={testi.padre} tipo="padri" valore={form.dati.padre_utente_id} nome={form.dati.padre_nome}
        onChange={cambia("padre_utente_id", "padre_nome")} disabilitato={disabilitato} />
    </CampoModulo>}
  </SezioneModulo>;
}
