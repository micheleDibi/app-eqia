import { Link } from "react-router";
import SezioneModulo from "../shared/SezioneModulo.jsx";
import { ArrowUpRight } from "../../config/icone.js";
import { PERCORSI } from "../../config/routes/percorsi.js";
import { pulsanteIcona } from "../../config/styles/pulsante.js";
import {
  cella, cellaIntestazione, contenitoreTabella, intestazioneTabella, rigaTabella, tabella,
} from "../../config/styles/tabella.js";
import { STILI_AZIENDA as stili } from "../../config/styles/azienda.js";
import { TESTI_AZIENDA } from "../../config/testi/azienda.js";
import { nominativoAttuatore } from "../../lib/azienda.js";
import { nomeRuoloId } from "../../lib/anagrafica.js";

const testi = TESTI_AZIENDA.attuatori;

/**
 * Sezione "Attuatori" della scheda del centro: Nominativo, Ruolo e la freccia
 * che apre la scheda dell'attuatore, da cui si torna a questo centro. Ci sono
 * solo gli attuatori che chi guarda puo' aprire, gia' filtrati dal server.
 *
 * @param {{ aziendaId: number, attuatori: Array<{ cliente_id: number, cliente_nome: string,
 *   cliente_cognome: string, cliente_ruolo: number }> }} props
 */
export default function AttuatoriCentro({ aziendaId, attuatori }) {
  const vuoto = attuatori.length === 0;
  return (
    <SezioneModulo titolo={testi.titolo} descrizione={vuoto ? testi.vuoto : testi.descrizione} griglia={false}>
      {!vuoto && (
        <div className={contenitoreTabella()}>
          <table className={`${tabella()} w-full`}>
            <caption className="sr-only">{testi.etichettaTabella}</caption>
            <thead className={intestazioneTabella()}>
              <tr>
                <th scope="col" className={cellaIntestazione()}>{testi.colonne.nominativo}</th>
                <th scope="col" className={cellaIntestazione()}>{testi.colonne.ruolo}</th>
                <th scope="col" className={`${cellaIntestazione("destra")} ${stili.cellaApri}`}>
                  <span className={stili.intestazioneNascosta}>{testi.colonne.apri}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {attuatori.map((attuatore) => {
                const nome = nominativoAttuatore(attuatore);
                return (
                  <tr key={attuatore.cliente_id} className={rigaTabella()}>
                    <td className={`${cella("forte")} ${stili.cellaTesto}`}>{nome}</td>
                    <td className={`${cella("tenue")} ${stili.cellaTesto}`}>{nomeRuoloId(attuatore.cliente_ruolo)}</td>
                    <td className={`${cella()} ${stili.cellaApri}`}>
                      <Link to={PERCORSI.attuatori.dettaglio(attuatore.cliente_id)} state={{ centro: aziendaId }}
                        className={pulsanteIcona("neutro", "minima")} title={testi.apri(nome)}
                        aria-label={testi.apri(nome)}>
                        <ArrowUpRight aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SezioneModulo>
  );
}
