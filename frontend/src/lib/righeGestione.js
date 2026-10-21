import { nomePersona } from "./gestione.js";
import { TESTI_GESTIONE as testi } from "../config/testi/gestione.js";

export function rigaGestione(tipo, dati) {
  if (tipo === "centro") return { id: dati.azienda_id, nome: dati.azienda_ragione_sociale, campi: {
    nome: dati.azienda_ragione_sociale, piva: dati.azienda_partitaIVA,
    sede: [dati.azienda_citta, dati.azienda_provincia].filter(Boolean).join(" · "), padre: dati.padre_nome || testi.nessuno,
  } };
  return { id: dati.cliente_id, nome: nomePersona(dati), campi: {
    nominativo: nomePersona(dati), ruolo: dati.ruolo_nome, codice: dati.cliente_codice_fiscale,
    centro: dati.centro_nome || testi.nessuno, stato: dati.attivo ? testi.attivo : testi.inattivo,
  } };
}
