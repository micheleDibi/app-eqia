import TabellaGestione from "./TabellaGestione.jsx";
import ListaGestione from "./ListaGestione.jsx";
import { rigaGestione } from "../../lib/righeGestione.js";
import { COLONNE_GESTIONE } from "../../config/elenchiGestione.js";

export default function RigheGestione({ tipo, dati, percorsi, stato, titolo }) {
  const props = { righe: dati.map(r => rigaGestione(tipo, r)), colonne: COLONNE_GESTIONE[tipo], percorsi, stato, titolo };
  return <div className="gestione-elenco"><TabellaGestione {...props} /><ListaGestione {...props} /></div>;
}
