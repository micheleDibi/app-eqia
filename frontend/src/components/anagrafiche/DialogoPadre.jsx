import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AlertMessage from "../AlertMessage.jsx";
import Dialogo from "../shared/Dialogo.jsx";
import { X } from "../../config/icone.js";
import { RUOLI } from "../../config/ruoli.js";
import { campo } from "../../config/styles/campo.js";
import { pulsante, pulsanteIcona } from "../../config/styles/pulsante.js";
import { cella, cellaIntestazione, intestazioneTabella, rigaTabella, statoVuoto, tabella } from
  "../../config/styles/tabella.js";
import { STILI_ANAGRAFICA as stili } from "../../config/styles/anagrafica.js";
import { TESTI_PADRE as testi } from "../../config/testi/anagrafica.js";
import { leggiPadri, nomeRuoloId, padreScelto } from "../../lib/anagrafica.js";

// Pausa fra l'ultima battitura e la ricerca.
const PAUSA_RICERCA_MS = 300;
// Distanza dal fondo dell'elenco a cui si chiedono gli attuatori successivi.
const MARGINE_SCORRIMENTO_PX = 80;
// [colonna, classi]: "attuatore" solo sotto i 768px, le quattro dopo da 768px.
const COLONNE = [
  ["attuatore", stili.colonnaStrettaPadre],
  ["nome", stili.colonnaLargaPadre],
  ["cognome", stili.colonnaLargaPadre],
  ["ruolo", stili.colonnaLargaPadre],
  ["centro", stili.colonnaLargaPadre],
  ["azione", stili.cellaAzionePadre],
];

/** "Rossi Mario", come negli elenchi. */
const nominativo = (voce) => [voce.cliente_cognome, voce.cliente_nome].filter(Boolean).join(" ") || testi.vuoto;

/**
 * Finestra "Cambia padre": gli attuatori per nome, cognome o centro, con il
 * filtro per ruolo; scorrendo in fondo arrivano i successivi. "Seleziona"
 * cambia solo cio' che si vede: il padre si salva con "Salva modifiche".
 * Portal su document.body: la ricerca non deve inviare il modulo della scheda.
 *
 * @param {{ clienteId: number, onSeleziona: (padre: { utente_id: number, nome: string }) => void,
 *   onChiudi: Function }} props
 */
export default function DialogoPadre({ clienteId, onSeleziona, onChiudi }) {
  const [cerca, setCerca] = useState("");
  const [ruolo, setRuolo] = useState("");
  const [elenco, setElenco] = useState({ voci: [], altri: false, caricamento: true, errore: "" });
  const scorrimento = useRef(null);
  // Ogni ricerca nuova scarta le risposte di quelle precedenti, anche delle
  // pagine successive gia' chieste.
  const ricerca = useRef(0);

  useEffect(() => {
    const numero = ++ricerca.current;
    const controllo = new AbortController();
    const attesa = setTimeout(() => {
      setElenco((prec) => ({ ...prec, caricamento: true, errore: "" }));
      leggiPadri(clienteId, { cerca, ruolo }, controllo.signal).then(({ voci, altri }) => {
        if (numero === ricerca.current) setElenco({ voci, altri, caricamento: false, errore: "" });
      }).catch((errore) => {
        if (!controllo.signal.aborted) setElenco({ voci: [], altri: false, caricamento: false, errore: errore.message });
      });
    }, PAUSA_RICERCA_MS);
    return () => { clearTimeout(attesa); controllo.abort(); };
  }, [clienteId, cerca, ruolo]);

  const scorri = () => {
    const area = scorrimento.current;
    if (!area || elenco.caricamento || !elenco.altri) return;
    if (area.scrollTop + area.clientHeight < area.scrollHeight - MARGINE_SCORRIMENTO_PX) return;
    const numero = ricerca.current;
    setElenco((prec) => ({ ...prec, caricamento: true }));
    leggiPadri(clienteId, { cerca, ruolo, dopo: elenco.voci.length }).then(({ voci, altri }) => {
      if (numero === ricerca.current) setElenco((prec) => ({ voci: [...prec.voci, ...voci], altri, caricamento: false, errore: "" }));
    }).catch((errore) => {
      if (numero === ricerca.current) setElenco((prec) => ({ ...prec, caricamento: false, errore: errore.message }));
    });
  };

  return createPortal(
    <Dialogo aperto onChiudi={onChiudi} etichetta={testi.titolo} variante="selezione">
      <div className="dialogo__selezione">
        <div className={stili.testataPadre}>
          <h2 className={stili.titoloPadre}>{testi.titolo}</h2>
          <button type="button" onClick={onChiudi} className={pulsanteIcona()} aria-label={testi.chiudi}
            title={testi.chiudi}>
            <X aria-hidden="true" className="size-icona" />
          </button>
        </div>

        <div className={stili.filtriPadre}>
          <input type="search" value={cerca} onChange={(evento) => setCerca(evento.target.value)}
            placeholder={testi.cerca} aria-label={testi.etichettaCerca} className={campo("comodo")}
            data-focus-iniziale />
          <select value={ruolo} onChange={(evento) => setRuolo(evento.target.value)} aria-label={testi.etichettaRuolo}
            className={`${campo("comodo")} ${stili.ruoloPadre}`}>
            <option value="" data-senza-filtro>{testi.tuttiIRuoli}</option>
            {RUOLI.map(({ id, nome }) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </div>

        {elenco.errore && <AlertMessage message={{ type: "error", text: elenco.errore }} separato={false} />}

        <div ref={scorrimento} onScroll={scorri} className={stili.elencoPadri}>
          <table className={`${tabella()} w-full`}>
            <caption className="sr-only">{testi.etichettaTabella}</caption>
            <thead className={`${intestazioneTabella()} ${stili.intestazionePadri}`}>
              <tr>
                {COLONNE.map(([colonna, classe]) => (
                  <th key={colonna} scope="col" className={`${cellaIntestazione()} ${classe}`}>
                    {testi.colonne[colonna]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {elenco.voci.map((voce) => {
                const padre = padreScelto(voce);
                const ruolo = nomeRuoloId(voce.cliente_ruolo);
                return (
                  <tr key={voce.cliente_id} className={rigaTabella()}>
                    <td className={`${cella()} ${stili.cellaAttuatorePadre}`}>
                      <span className={stili.nomeAttuatorePadre}>{nominativo(voce)}</span>
                      <span className={stili.dettaglioAttuatorePadre}>{testi.dettaglio(ruolo, voce.centro)}</span>
                    </td>
                    <td className={`${cella()} ${stili.colonnaLargaPadre} ${stili.cellaTestoPadre}`}>
                      {voce.cliente_nome || testi.vuoto}
                    </td>
                    <td className={`${cella()} ${stili.colonnaLargaPadre} ${stili.cellaTestoPadre}`}>
                      {voce.cliente_cognome || testi.vuoto}
                    </td>
                    <td className={`${cella("tenue")} ${stili.colonnaLargaPadre} ${stili.cellaTestoPadre}`}>{ruolo}</td>
                    <td className={`${cella("tenue")} ${stili.colonnaLargaPadre} ${stili.cellaTestoPadre}`}>
                      {voce.centro || testi.vuoto}
                    </td>
                    <td className={`${cella()} ${stili.cellaAzionePadre}`}>
                      <button type="button" onClick={() => onSeleziona(padre)} className={pulsante("primario", "piccolo")}
                        aria-label={testi.selezionaNome(padre.nome)}>
                        {testi.seleziona}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {elenco.voci.length === 0 && !elenco.caricamento && !elenco.errore && (
                <tr>
                  <td colSpan={COLONNE.length} className={statoVuoto()}>{testi.nessuno}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p role="status" className={stili.statoPadri}>{elenco.caricamento ? testi.caricamento : ""}</p>
      </div>
    </Dialogo>,
    document.body,
  );
}
