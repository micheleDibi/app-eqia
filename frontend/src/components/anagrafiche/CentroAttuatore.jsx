import { useEffect, useRef } from "react";
import { Link } from "react-router";
import AlertMessage from "../AlertMessage.jsx";
import CampoModulo from "../shared/CampoModulo.jsx";
import DialogoConferma from "../shared/DialogoConferma.jsx";
import useCentroAttuatore from "../../hooks/useCentroAttuatore.js";
import { ArrowUpRight } from "../../config/icone.js";
import { PERCORSI } from "../../config/routes/percorsi.js";
import { campo } from "../../config/styles/campo.js";
import { pulsante, pulsanteIcona } from "../../config/styles/pulsante.js";
import { STILI_ANAGRAFICA as stili } from "../../config/styles/anagrafica.js";
import { STILI_AZIENDA } from "../../config/styles/azienda.js";
import { TESTI_AZIENDA } from "../../config/testi/azienda.js";
import { TESTI_CENTRO as testi } from "../../config/testi/anagrafica.js";

/**
 * Scheda Centro di un attuatore: il centro associato, con la freccia che ne
 * apre la scheda (`apribile`, dal server). Con `modificabile` si cerca un
 * centro per partita IVA e lo si associa, lo si cambia o si toglie
 * l'associazione: tutto ha effetto subito, non con "Salva modifiche".
 * Un centro che chi guarda non vede (`nascosto`) non mostra i suoi dati.
 *
 * @param {{
 *   clienteId: number,
 *   centro: object|null,
 *   nascosto: boolean,
 *   modificabile: boolean,
 *   onAggiornato: (scheda: object) => void,
 * }} props
 */
export default function CentroAttuatore({ clienteId, centro, nascosto, modificabile, onAggiornato }) {
  const stato = useCentroAttuatore(clienteId, centro, onAggiornato);
  // "Cambia centro" porta il cursore sulla partita IVA.
  const campoRicerca = useRef(null);
  const conCentro = Boolean(centro);
  useEffect(() => {
    if (stato.ricerca && conCentro) campoRicerca.current?.focus();
  }, [stato.ricerca, conCentro]);

  if (nascosto) return <div className={stili.vuoto}>{testi.nascosto}</div>;
  if (!centro && !modificabile) return <div className={stili.vuoto}>{testi.vuoto}</div>;

  const ricerca = (
    <div className={stili.ricercaCentro}>
      <CampoModulo per="centro-partita-iva" etichetta={testi.etichettaRicerca} colonne={6}
        nota={stato.erroreRicerca} tonoNota="errore">
        <input
          ref={campoRicerca}
          id="centro-partita-iva"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={stato.partitaIva}
          onChange={(evento) => stato.scriviPartitaIva(evento.target.value)}
          // Invio cerca il centro: senza, salverebbe la scheda.
          onKeyDown={(evento) => {
            if (evento.key !== "Enter") return;
            evento.preventDefault();
            if (!stato.occupato) stato.cerca();
          }}
          placeholder={testi.segnapostoRicerca}
          aria-invalid={Boolean(stato.erroreRicerca) || undefined}
          aria-describedby={stato.erroreRicerca ? "centro-partita-iva-nota" : undefined}
          className={campo("comodo", { errore: Boolean(stato.erroreRicerca) })}
        />
      </CampoModulo>
      <div className={stili.azioniRicercaCentro}>
        <button type="button" onClick={stato.cerca} disabled={stato.occupato} className={pulsante("primario", "medio")}>
          {stato.occupato ? testi.ricercaInCorso : testi.cerca}
        </button>
        {centro && (
          <button type="button" onClick={stato.annullaRicerca} className={pulsante("testuale", "medio")}>
            {testi.annulla}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={stili.centro}>
      <AlertMessage message={stato.messaggio} separato={false} />
      {!centro && <p className={stili.testoCentro}>{testi.vuoto}</p>}
      {centro && stato.ricerca && <p className={stili.testoCentro}>{testi.attuale(centro.ragione_sociale)}</p>}
      {stato.ricerca ? ricerca : <DatiCentro centro={centro} modificabile={modificabile} stato={stato} />}
      <DialogoConferma
        aperto={stato.confermaRimozione}
        titolo={testi.rimuovi}
        messaggio={testi.confermaRimozione}
        conferma={testi.rimuovi}
        annulla={testi.annulla}
        pericolo
        onConferma={stato.rimuovi}
        onAnnulla={stato.annullaRimozione}
      />
    </div>
  );
}

function DatiCentro({ centro, modificabile, stato }) {
  const dati = [
    ["ragione_sociale", centro.ragione_sociale],
    ["partita_iva", centro.partita_iva],
    ["codice_fiscale", centro.codice_fiscale],
    ["email", centro.email],
    ["pec", centro.pec],
    ["telefono", centro.telefono],
    ["sede", testi.sede(centro.citta, centro.provincia)],
  ];
  const apri = TESTI_AZIENDA.apriCentro(centro.ragione_sociale);
  return (
    <>
      <div className={stili.testataCentro}>
        <div className={STILI_AZIENDA.nomeCentro}>
          <h3 className={stili.titoloCentro}>{centro.ragione_sociale}</h3>
          {centro.apribile && (
            <Link to={PERCORSI.aziende.dettaglio(centro.azienda_id)} className={pulsanteIcona("neutro", "minima")}
              title={apri} aria-label={apri}>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          )}
        </div>
        {modificabile && (
          <div className={stili.azioniCentro}>
            <button type="button" onClick={stato.apriRicerca} disabled={stato.occupato}
              className={pulsante("contorno", "medio")}>
              {testi.cambia}
            </button>
            <button type="button" onClick={stato.chiediRimozione} disabled={stato.occupato}
              className={pulsante("testuale", "medio")}>
              {testi.rimuovi}
            </button>
          </div>
        )}
      </div>
      <dl className={stili.datiCentro}>
        {dati.map(([chiave, valore]) => (
          <div key={chiave} className="flex min-w-0 flex-col">
            <dt className={stili.etichettaDato}>{testi.campi[chiave]}</dt>
            <dd className={stili.valoreDato}>{valore || testi.trattino}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
