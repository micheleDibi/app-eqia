import { TESTI_GESTIONE as testi } from "./testi/gestione.js";
export const COLONNE_GESTIONE = {
  attuatore: [{ id: "nominativo", etichetta: "Nominativo" }, { id: "ruolo", etichetta: testi.ruolo },
    { id: "centro", etichetta: testi.centroLabel }, { id: "stato", etichetta: testi.stato }],
  sottoscrittore: [{ id: "nominativo", etichetta: "Nominativo" }, { id: "codice", etichetta: "Codice fiscale" },
    { id: "centro", etichetta: testi.centroLabel }, { id: "stato", etichetta: testi.stato }],
  centro: [{ id: "nome", etichetta: "Ragione sociale" }, { id: "piva", etichetta: "Partita IVA" },
    { id: "sede", etichetta: "Sede" }, { id: "padre", etichetta: testi.padreCentro }],
};
