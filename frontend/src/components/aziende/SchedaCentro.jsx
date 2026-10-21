import { useEffect, useRef } from "react";
import useSchedaCentro from "../../hooks/useSchedaCentro.js";
import PaginaNonTrovata from "../PaginaNonTrovata.jsx";
import AlertMessage from "../AlertMessage.jsx";
import IntestazionePagina from "../shared/IntestazionePagina.jsx";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import StatoCaricamentoDettaglio from "../shared/StatoCaricamentoDettaglio.jsx";
import CampiAzienda from "./CampiAzienda.jsx";
import AttuatoriCentro from "./AttuatoriCentro.jsx";
import { contenutoPagina } from "../../config/styles/pagina.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { barraAzioniModulo } from "../../config/styles/superficie.js";
import { STILI_AZIENDA as stili } from "../../config/styles/azienda.js";
import { CAMPI_ANAGRAFICI, SEZIONI_AZIENDA } from "../../config/campiAzienda.js";
import { TESTI_AZIENDA as testi } from "../../config/testi/azienda.js";
import GerarchiaCentro from "./GerarchiaCentro.jsx";
import CollegamentiCentro from "../gestione/CollegamentiCentro.jsx";

const ANAGRAFICI_SOLA_LETTURA = Object.fromEntries(CAMPI_ANAGRAFICI.map((nome) => [nome, true]));

/**
 * Scheda di un centro: dati anagrafici, sede, contatti, coordinate bancarie
 * e attuatori collegati, con "Salva modifiche" sotto la scheda. Fuori dal
 * Nazionale i dati anagrafici sono in sola lettura.
 */
export default function SchedaCentro() {
  const pagina = useSchedaCentro();
  const { lettura, salvata, avviso } = pagina;
  // L'esito del salvataggio sta sopra la scheda, "Salva modifiche" sotto:
  // senza, chi salva dal fondo della pagina non lo vedrebbe.
  const riquadroAvviso = useRef(null);
  useEffect(() => {
    if (avviso) riquadroAvviso.current?.scrollIntoView({ block: "nearest" });
  }, [avviso]);

  if (lettura.errore?.stato === 404) return <PaginaNonTrovata />;
  if (lettura.caricamento || lettura.errore)
    return <StatoCaricamentoDettaglio loading={lettura.caricamento} errore={lettura.errore} ritorno={pagina.rottaElenco} />;

  const soloLettura = salvata.permessi.anagrafici ? undefined : ANAGRAFICI_SOLA_LETTURA;
  return (
    <div className={contenutoPagina("modulo", { codaAmpia: true })}>
      <IntestazionePagina
        titolo={testi.titoloModifica}
        descrizione={salvata.azienda_ragione_sociale}
        indietro={{ rotta: pagina.rottaElenco, etichetta: testi.ritorno }}
      />
      <form onSubmit={pagina.salva} className={stili.modulo}>
        {avviso && (
          <div ref={riquadroAvviso} className={stili.riquadroAvviso}>
            <AlertMessage message={avviso} separato={false} />
          </div>
        )}

        <div className={stili.schedaModulo}>
          {SEZIONI_AZIENDA.map(({ chiave, campi }) => (
            <SezioneModulo key={chiave} titolo={testi.sezioni[chiave].titolo}
              descrizione={testi.sezioni[chiave].descrizione}>
              <CampiAzienda dati={pagina.dati} onChange={pagina.cambia} gruppo={campi}
                soloLettura={chiave === "anagrafici" ? soloLettura : undefined} />
            </SezioneModulo>
          ))}
          <GerarchiaCentro pagina={pagina} />
          <AttuatoriCentro aziendaId={salvata.azienda_id} attuatori={salvata.attuatori} />
          <CollegamentiCentro id={salvata.azienda_id} />
        </div>

        <div className={barraAzioniModulo("pagina")}>
          <button type="button" onClick={pagina.annulla} className={pulsante("testuale", "grande")}>
            {testi.annulla}
          </button>
          <button type="submit" disabled={pagina.salvataggio} className={pulsante("primario", "grande")}>
            {pagina.salvataggio ? testi.salvataggio : testi.salvaModifiche}
          </button>
        </div>
      </form>
    </div>
  );
}
