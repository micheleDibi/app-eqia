import { AlarmClock, Ban, CalendarCheck, CalendarClock, CalendarX, CirclePause } from "../../config/icone.js";

const ICONE = { attenzione: AlarmClock, aperto: CalendarCheck, neutro: CalendarX, informazione: CalendarClock };

// Icone per chiave, prima di quelle per tono: "Revocato" e "Chiuso" sono
// entrambi neutri e si distinguono per testo e icona.
const ICONE_CHIAVE = { revocato: Ban, sospeso: CirclePause, "in-apertura": CalendarClock, "apre-il": CalendarClock };

/**
 * Distintivo di stato della selezione del personale (statoOpportunita) e dei
 * bandi (statoBando): testo, icona e tono, mai il solo colore. Senza stato
 * (interpelli, stati "altro" o sconosciuti) non compare.
 */
export default function DistintivoScadenza({ stato }) {
  if (!stato) return null;
  const tono = ICONE[stato.tono] ? stato.tono : "neutro";
  const Icona = ICONE_CHIAVE[stato.chiave] ?? ICONE[tono];
  return (
    <span className="edunews24-distintivo" data-tono={tono} data-chiave={stato.chiave}>
      <Icona aria-hidden="true" className="edunews24-distintivo__icona" />
      {stato.testo}
    </span>
  );
}
