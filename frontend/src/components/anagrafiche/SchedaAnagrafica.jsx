import { useEffect, useRef } from "react";
import useSchedaAnagrafica from "../../hooks/useSchedaAnagrafica.js";
import { useIngresso } from "../../hooks/useIngresso.js";
import PaginaNonTrovata from "../PaginaNonTrovata.jsx";
import AlertMessage from "../AlertMessage.jsx";
import BarraSchede from "../shared/BarraSchede.jsx";
import IntestazionePagina from "../shared/IntestazionePagina.jsx";
import StatoCaricamentoDettaglio from "../shared/StatoCaricamentoDettaglio.jsx";
import DatiPrincipali from "./DatiPrincipali.jsx";
import CentroAttuatore from "./CentroAttuatore.jsx";
import UtenteAnagrafica from "./UtenteAnagrafica.jsx";
import { contenutoPagina } from "../../config/styles/pagina.js";
import { pillola } from "../../config/styles/pillola.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { barraAzioniModulo, scheda as superficieScheda } from "../../config/styles/superficie.js";
import { STILI_ANAGRAFICA as stili } from "../../config/styles/anagrafica.js";
import { TESTI_ANAGRAFICA as testi } from "../../config/testi/anagrafica.js";
import { pillolaStato } from "../../lib/account.js";
import { nominativo } from "../../lib/anagrafica.js";

// Schede non composte da SezioneModulo: il pannello aggiunge il suo margine.
// Le altre poggiano direttamente sulla scheda.
const PANNELLI_CON_MARGINE = new Set(["centro"]);

/**
 * Scheda di un sottoscrittore o di un attuatore: Anagrafica, Centro (solo
 * attuatori) e Utente, con "Salva modifiche" in fondo a ogni scheda.
 *
 * @param {{ tipo: "sottoscrittore"|"attuatore" }} props
 */
export default function SchedaAnagrafica({ tipo }) {
  const pagina = useSchedaAnagrafica(tipo);
  const pannello = useIngresso(pagina.attiva);
  const { lettura, salvata, attiva, avviso } = pagina;
  // L'esito del salvataggio sta sopra la scheda, "Salva modifiche" in fondo:
  // senza, chi salva da meta' pagina non lo vedrebbe.
  const riquadroAvviso = useRef(null);
  useEffect(() => {
    if (avviso) riquadroAvviso.current?.scrollIntoView({ block: "nearest" });
  }, [avviso]);

  if (lettura.errore?.stato === 404) return <PaginaNonTrovata />;
  if (lettura.caricamento || lettura.errore)
    return <StatoCaricamentoDettaglio loading={lettura.caricamento} errore={lettura.errore} ritorno={pagina.ritorno.rotta} />;

  // Testata: nome e codice fiscale salvati, non quelli che si stanno scrivendo.
  const nome = nominativo(salvata);
  const stato = pillolaStato(pagina.attivazione);
  const descrizione = (
    <>
      {nome && <span className={stili.nomeTestata}>{nome}</span>}
      {salvata.cliente_codice_fiscale && <span className={stili.codiceTestata}>{salvata.cliente_codice_fiscale}</span>}
      {stato && <span className={pillola(stato.tono)}>{stato.testo}</span>}
    </>
  );

  return (
    <div className={contenutoPagina("modulo")}>
      <IntestazionePagina
        titolo={testi.titolo(tipo)}
        indietro={pagina.ritorno}
        descrizione={descrizione}
      />
      <div ref={riquadroAvviso} className={stili.riquadroAvviso}>
        <AlertMessage message={avviso} />
      </div>
      {/* overflow-clip e non overflow-hidden: ritaglia gli angoli senza
          diventare un contenitore di scorrimento, che bloccherebbe sticky. */}
      <div className={`${superficieScheda()} schede overflow-clip`}>
        <form onSubmit={pagina.salva}>
          <BarraSchede
            id="anagrafica"
            etichetta={testi.etichettaSchede}
            schede={pagina.schede}
            attiva={attiva}
            onChange={pagina.setAttiva}
            disabilitata={pagina.salvataggio}
          />

          <div
            ref={pannello}
            role="tabpanel"
            id={`anagrafica-pannello-${attiva}`}
            aria-labelledby={`anagrafica-scheda-${attiva}`}
            className={`movimento-scheda schede__pannello ${
              PANNELLI_CON_MARGINE.has(attiva) ? "" : "schede__pannello--sezioni"
            }`}
          >
            {/* Solo la scheda aperta e' montata: la validazione del browser
                riguarda i campi che si vedono. Il modulo vive nel hook, e
                cambiare scheda non perde le modifiche. */}
            {attiva === "dati-principali" && (
              <DatiPrincipali
                tipo={tipo}
                clienteId={pagina.clienteId}
                dati={pagina.dati}
                onCambia={pagina.cambia}
                onScegliRelazione={pagina.scegliRelazione}
                onCopiaResidenza={pagina.copiaResidenza}
                ruoli={salvata.permessi.ruoli}
                onStatoAccount={pagina.aggiornaAccount}
              />
            )}
            {attiva === "centro" && (
              <CentroAttuatore
                clienteId={pagina.clienteId}
                centro={salvata.centro}
                nascosto={salvata.centro_nascosto}
                modificabile={salvata.permessi.centro}
                onAggiornato={pagina.aggiornaCentro}
              />
            )}
            {attiva === "utente" && (
              <UtenteAnagrafica
                scheda={salvata}
                dati={pagina.dati}
                onCambia={pagina.cambia}
                onScegliPadre={pagina.scegliPadre}
                attivazione={pagina.attivazione}
                onStato={pagina.aggiornaAccount}
                onAccedi={pagina.accedi}
              />
            )}
          </div>

          {/* Fuori dal pannello: resta agganciata in fondo in ogni scheda. */}
          <div className={`${barraAzioniModulo("scheda")} ${stili.barraAzioni}`}>
            <div className={stili.azioniSalvataggio}>
              <button type="button" onClick={pagina.annulla} className={pulsante("contorno", "grande")}>
                {testi.annulla}
              </button>
              <button type="submit" disabled={pagina.salvataggio} className={pulsante("primario", "grande")}>
                {pagina.salvataggio ? testi.salvataggio : testi.salva}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
