// Sezione account della scheda anagrafica (components/account/): verifica di
// email e cellulare e stato dell'account.

export const TESTI_ACCOUNT = {
  titolo: "Account",
  descrizione: "Email e cellulare sono i recapiti usati per accesso e comunicazioni.",
  attivazione:
    "Verifica email e cellulare per attivare l’account. Le credenziali saranno inviate via email.",
  email: "Email",
  cellulare: "Cellulare",
  /** Pillola del recapito verificato: "Verificata" per l'email. */
  verificato: (tipo) => (tipo === "email" ? "Verificata" : "Verificato"),
  verifica: "Verifica",
  verificatoIl: (data) => `Verificato il ${data}`,
  daSalvare: "Salva le modifiche per verificare questo contatto.",
  vuoto: "Non indicato.",
  caricamento: "Caricamento…",
  erroreLettura: "Impossibile leggere lo stato dell'account. Riprova.",
  dialogo: {
    etichetta: "Verifica contatto",
    titolo: (tipo) => `Verifica ${tipo === "email" ? "email" : "cellulare"}`,
    descrizione: (valore) => `Invieremo un codice a ${valore}.`,
  },
  stato: {
    etichetta: "Stato account",
    valori: {
      attivo: { testo: "Attivo", tono: "positivo" },
      disattivato: { testo: "Disattivo", tono: "negativo" },
      in_attesa: { testo: "In attesa di attivazione", tono: "neutro" },
    },
    attiva: "Attiva",
    disattiva: "Disattiva",
    attivato: "Account attivato.",
    disattivato: "Account disattivato.",
    erroreSalvataggio: "Impossibile cambiare lo stato dell'account. Riprova.",
    conferma: {
      disattiva: {
        titolo: "Disattivare l'account?",
        messaggio: "La persona non potrà più accedere e le sessioni già aperte si chiuderanno.",
        conferma: "Disattiva",
      },
      riattiva: {
        titolo: "Riattivare l'account?",
        messaggio: "La persona potrà di nuovo accedere con la sua password.",
        conferma: "Attiva",
      },
      attivaInAttesa: {
        titolo: "Attivare l'account a mano?",
        messaggio: "Attivando a mano non vengono inviate credenziali: la persona imposterà la password con il " +
          "recupero. L'attivazione dopo la verifica dei contatti non avverrà più.",
        conferma: "Attiva",
      },
    },
  },
};
