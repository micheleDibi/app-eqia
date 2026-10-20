import { useEffect, useRef, useState } from "react";
import { Check, Share2, TriangleAlert } from "../../config/icone.js";
import { DURATA_AVVISO_ESITO_MS, DURATA_CONFERMA_AZIONE_MS } from "../../config/interazioni.js";
import { STILI_CONDIVIDI, fumettoCondividi } from "../../config/styles/condividi.js";
import { TESTI_EDUNEWS24 as testi } from "../../config/testi/edunews24.js";
import { condividiLink } from "../../lib/edunews24Condividi.js";

// Esiti con un messaggio: "condiviso" e "annullato" non ne hanno.
const ESITI = {
  copiato: { Icona: Check, testo: testi.condividi.copiato, durata: DURATA_CONFERMA_AZIONE_MS },
  errore: { Icona: TriangleAlert, testo: testi.condividi.errore, durata: DURATA_AVVISO_ESITO_MS },
};

/**
 * "Condividi" di una notizia della pagina, in coda ai metadati (solo
 * elementi in linea: sta nel <p> di MetadatiVoce). Il pannello del sistema o,
 * in ripiego, la copia del link li decide condividiLink.
 *
 * Dopo una copia o un errore l'icona cambia e la frase compare nel fumetto
 * sopra il pulsante, che e' la regione di stato: l'altezza della voce non
 * cambia. A ogni clic la regione si svuota prima del nuovo esito, cosi' il
 * messaggio viene riletto, e il timer riparte. Un clic mentre una
 * condivisione e' ancora aperta si ignora.
 */
export default function PulsanteCondividi({ voce }) {
  const [esito, setEsito] = useState(null);
  const sequenza = useRef(0);
  const inCorso = useRef(false);
  const timer = useRef(null);
  useEffect(() => () => {
    clearTimeout(timer.current);
    sequenza.current += 1;
  }, []);

  const condividi = async () => {
    if (inCorso.current) return;
    inCorso.current = true;
    const richiesta = ++sequenza.current;
    clearTimeout(timer.current);
    setEsito(null);
    const risultato = await condividiLink(voce);
    inCorso.current = false;
    if (richiesta !== sequenza.current || !ESITI[risultato]) return;
    setEsito(risultato);
    timer.current = setTimeout(() => setEsito(null), ESITI[risultato].durata);
  };

  const attuale = esito ? ESITI[esito] : null;
  const Icona = attuale?.Icona ?? Share2;
  return (
    <span className={["edunews24-condividi", STILI_CONDIVIDI.radice].join(" ")}>
      <button type="button" className={STILI_CONDIVIDI.pulsante} aria-label={testi.condividi.nome(voce.titolo)}
        onClick={condividi}>
        <Icona aria-hidden="true" className={STILI_CONDIVIDI.icona} />
        <span className="edunews24-condividi__testo">{testi.condividi.comando}</span>
      </button>
      <span role="status" className={fumettoCondividi(Boolean(attuale))}>{attuale?.testo ?? ""}</span>
    </span>
  );
}
