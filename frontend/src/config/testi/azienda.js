/** Scheda di un centro ("Modifica centro", components/aziende/). */
export const TESTI_AZIENDA = {
  titoloModifica: "Modifica centro",
  ritorno: "Centri",
  caricamento: "Caricamento del centro…",
  erroreLettura: "Impossibile caricare il centro.",
  annulla: "Annulla",
  salvaModifiche: "Salva modifiche",
  salvataggio: "Salvataggio…",
  salvataggioRiuscito: "Modifiche salvate.",
  nessunaModifica: "Nessuna modifica da salvare.",
  erroreSalvataggio: "Impossibile salvare il centro. Riprova.",
  // Valore assente in sola lettura.
  trattino: "—",
  // Avviso sotto la partita IVA mentre si scrive.
  pivaNonConforme: "La partita IVA deve essere di 11 cifre.",

  campi: {
    azienda_ragione_sociale: "Ragione sociale",
    azienda_partitaIVA: "Partita IVA",
    azienda_codiceFiscale: "Codice fiscale",
    azienda_fatturazioneSDI: "Codice SDI",
    azienda_codice_nazionale: "Codice nazionale",
    azienda_via: "Via",
    azienda_civico: "Civico",
    azienda_CAP: "CAP",
    azienda_citta: "Città",
    azienda_provincia: "Prov.",
    azienda_email: "Email",
    azienda_pec: "PEC",
    azienda_telefono: "Telefono",
    azienda_sitoWeb: "Sito web",
    azienda_iban: "IBAN",
    azienda_codice_bic: "Codice BIC",
  },

  segnaposti: {
    azienda_fatturazioneSDI: "7 caratteri",
    azienda_pec: "nome@pec.it",
    azienda_iban: "IT00 X000 0000 0000 0000 0000 000",
    azienda_codice_bic: "XXXXITXX",
  },

  sezioni: {
    anagrafici: {
      titolo: "Dati anagrafici",
      descrizione: "Identificazione fiscale e codici del centro.",
    },
    sede: { titolo: "Sede legale", descrizione: "Indirizzo completo della sede." },
    contatti: {
      titolo: "Contatti",
      descrizione: "Recapiti per comunicazioni e fatturazione.",
    },
    bancari: {
      titolo: "Coordinate bancarie",
      descrizione: "Conto per accrediti e pagamenti.",
    },
  },

  // Sezione "Attuatori": quelli del centro che chi guarda puo' aprire.
  attuatori: {
    titolo: "Attuatori",
    descrizione: "Attuatori collegati a questo centro.",
    vuoto: "Nessun attuatore collegato a questo centro.",
    etichettaTabella: "Attuatori del centro",
    colonne: { nominativo: "Nominativo", ruolo: "Ruolo", apri: "Apri" },
    apri: (nome) => `Apri l'attuatore ${nome}`,
  },
  // Freccia della scheda Centro di un attuatore.
  apriCentro: (nome) => `Apri il centro ${nome}`,
};
