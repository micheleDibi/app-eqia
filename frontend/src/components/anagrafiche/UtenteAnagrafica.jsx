import { useState } from "react";
import AlertMessage from "../AlertMessage.jsx";
import StatoAccount from "../account/StatoAccount.jsx";
import { useAccount } from "../../hooks/useAccount.js";
import { campo, etichetta } from "../../config/styles/campo.js";
import { pulsante } from "../../config/styles/pulsante.js";
import { colonnaCampo, STILI_ANAGRAFICA as stili } from "../../config/styles/anagrafica.js";
import { TESTI_ACCOUNT } from "../../config/testi/account.js";
import { TESTI_UTENTE as testi } from "../../config/testi/anagrafica.js";
import { dataCronologia } from "../../lib/anagrafica.js";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import CampoModulo from "../shared/CampoModulo.jsx";
import DialogoPadre from "./DialogoPadre.jsx";
import SceltaRuolo from "./SceltaRuolo.jsx";

/**
 * Scheda Utente: account e ruolo, gerarchia e cronologia. Nome utente,
 * stato (Attiva/Disattiva) e utente padre li cambia solo il Nazionale; per
 * gli altri sono bloccati. Nome utente e padre si salvano con "Salva
 * modifiche", lo stato subito.
 *
 * @param {{
 *   scheda: object,
 *   dati: { ruolo: string, username: string, padre: { utente_id: number, nome: string }|null },
 *   onCambia: Function,
 *   onScegliPadre: Function,
 *   attivazione: string|null,
 *   onStato: Function,
 *   onAccedi: Function,
 * }} props
 *   scheda: l'anagrafica salvata; dati: il modulo a video, con il ruolo
 *   condiviso con la tendina della scheda Anagrafica. attivazione: lo stato
 *   noto alla pagina, finche' la sezione non ha riletto il suo; onStato: il
 *   nuovo stato dopo un cambio.
 */
export default function UtenteAnagrafica({ scheda, dati, onCambia, onScegliPadre, attivazione, onStato, onAccedi }) {
  const { account, permessi } = scheda;
  const statoAccount = useAccount(scheda.cliente_id, onStato);
  const [sceltaPadre, setSceltaPadre] = useState(false);
  const cronologia = [
    [testi.creato, dataCronologia(account.creato_il)],
    [testi.aggiornato, dataCronologia(account.aggiornato_il)],
    [testi.aggiornatoDa, account.aggiornato_da?.nome],
  ];

  return (
    <div>
      {sceltaPadre && (
        <DialogoPadre clienteId={scheda.cliente_id} onChiudi={() => setSceltaPadre(false)}
          onSeleziona={(padre) => { onScegliPadre(padre); setSceltaPadre(false); }} />
      )}
      <SezioneModulo titolo={testi.account.titolo} descrizione={testi.account.descrizione}>
        {statoAccount.messaggio && (
          <div className="col-span-6">
            <AlertMessage message={statoAccount.messaggio} separato={false} />
          </div>
        )}
        <CampoModulo per="utente-username" etichetta={testi.username} colonne={3}>
          <input id="utente-username" type="text" name="username" value={dati.username} onChange={onCambia}
            readOnly={!permessi.username} required={permessi.username} autoComplete="off"
            className={campo("comodo")} />
        </CampoModulo>

        <div className={colonnaCampo(3)}>
          <span className={etichetta()}>{TESTI_ACCOUNT.stato.etichetta}</span>
          <div className={`${stili.cellaStato} gap-3`}>
            <StatoAccount attivazione={statoAccount.stato?.attivazione ?? attivazione} forma="grande"
              modificabile={permessi.stato_account && Boolean(statoAccount.stato)} occupato={statoAccount.occupato}
              onCambia={statoAccount.cambiaStato} />
          </div>
        </div>

        <CampoModulo per="utente-ruolo" etichetta={testi.ruolo} colonne={3}>
          <SceltaRuolo id="utente-ruolo" valore={dati.ruolo} ruoli={permessi.ruoli} onCambia={onCambia} />
        </CampoModulo>

        <div className={colonnaCampo(3)}>
          <span className={etichetta()}>{testi.padre}</span>
          <div className={stili.riquadroPadre}>
            <span className={stili.nomePadre}>{dati.padre?.nome ?? testi.nessuno}</span>
            <button type="button" onClick={() => setSceltaPadre(true)} disabled={!permessi.padre}
              className={`${pulsante("contorno", "minimo")} shrink-0`}>
              {testi.cambiaPadre}
            </button>
          </div>
        </div>

        {permessi.accedi && (
          <div className={stili.azioniUtente}>
            <button type="button" onClick={onAccedi} className={pulsante("contorno")}>{testi.accedi}</button>
          </div>
        )}
      </SezioneModulo>

      <SezioneModulo titolo={testi.cronologia} griglia={false}>
        <dl className={stili.cronologia}>
          {cronologia.map(([voce, valore]) => (
            <div key={voce}>
              <dt className={etichetta("secondaria")}>{voce}</dt>
              <dd className={stili.valoreCronologia}>{valore || testi.vuoto}</dd>
            </div>
          ))}
        </dl>
      </SezioneModulo>
    </div>
  );
}
