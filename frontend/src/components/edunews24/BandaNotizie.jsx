import { chiaveVoce } from "../../lib/edunews24.js";
import VoceNotiziaPagina from "./VoceNotiziaPagina.jsx";

// Come si presenta ogni voce di una banda. Grande: scheda con il player se
// c'e' il video, ripiego blu e sintesi di 2 righe. Media: compatta con
// l'immagine; senza immagine di solo testo con 3 righe di sintesi
// (formaVocePagina in VoceNotiziaPagina), il ripiego velo solo se l'immagine
// non si carica.
// Fascia: media e testo affiancati, titolo "apertura", sintesi di 3 righe.
// Testo: senza media, sintesi di 3 righe.
const GRANDE = { forma: "scheda", player: true, campitura: "blu", ruolo: "titolo", righeSintesi: 2 };
const MEDIA = { forma: "compatta", player: false, campitura: "velo", ruolo: "titolo", righeSintesi: 0 };
const FASCIA = { forma: "fascia", player: true, campitura: "blu", ruolo: "apertura", righeSintesi: 3 };
const TESTO = { forma: "testo", player: false, campitura: "velo", ruolo: "titolo", righeSintesi: 3 };

// Voci per schema, nell'ordine della banda: la coppia e' 7|5 (grande a
// sinistra), lo specchio 5|7 (grande a destra).
const VOCI_BANDA = {
  coppia: [GRANDE, MEDIA],
  "coppia-specchio": [MEDIA, GRANDE],
  terzina: [MEDIA, MEDIA, MEDIA],
  fascia: [FASCIA],
  trio: [TESTO, TESTO, TESTO],
};

// La coda (ultima banda incompleta di una pagina) prende la forma fascia con
// una voce, una coppia 6|6 con le immagini con due.
function impostazione(schema, indice, quante) {
  if (schema === "coda") return quante === 1 ? FASCIA : MEDIA;
  return VOCI_BANDA[schema]?.[indice] ?? MEDIA;
}

/**
 * Una banda della griglia "Altre notizie" (bandeGriglia): coppia, terzina,
 * fascia, trio, coppia-specchio o coda. Le colonne le decide il CSS da
 * data-schema; ogni banda sta dentro una sola pagina caricata, quindi "Carica
 * altri" non ricompone mai le righe gia' viste.
 *
 * Quando la colonna piccola di coppia e specchio ha due voci (`colonnaB`: la
 * voce B senza immagine e quella dopo), le due voci sono di solo testo, una
 * sotto l'altra con il divisore, in un solo figlio della banda: le colonne
 * 7|5 e 5|7 restano quelle del CSS. Con la voce B sola la banda non cambia.
 */
export default function BandaNotizie({ banda, adesso }) {
  const colonnaB = banda.colonnaB ?? [];
  if (colonnaB.length > 1) {
    const grande = banda.voci.find((voce) => !colonnaB.includes(voce));
    const voceGrande = <VoceNotiziaPagina voce={grande} adesso={adesso} {...GRANDE} />;
    const colonna = (
      <div className="edunews24-banda__colonna">
        {colonnaB.map((voce) => <VoceNotiziaPagina key={chiaveVoce(voce)} voce={voce} adesso={adesso} {...TESTO} />)}
      </div>
    );
    return (
      <div className="edunews24-banda" data-schema={banda.schema}>
        {banda.schema === "coppia" ? <>{voceGrande}{colonna}</> : <>{colonna}{voceGrande}</>}
      </div>
    );
  }
  return (
    <div className="edunews24-banda" data-schema={banda.schema}>
      {banda.voci.map((voce, indice) => (
        <VoceNotiziaPagina key={chiaveVoce(voce)} voce={voce} adesso={adesso}
          {...impostazione(banda.schema, indice, banda.voci.length)} />
      ))}
    </div>
  );
}
