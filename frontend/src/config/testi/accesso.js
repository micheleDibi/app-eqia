// Catalogo italiano del flusso di accesso; il nome del prodotto resta in routes/rotte.

// Il blocco per i codici email dura fino a un'ora: dai 90 secondi si conta in
// minuti, arrotondati per eccesso.
const durata = (n) => (n >= 90 ? `${Math.ceil(n / 60)} minuti` : n === 1 ? "1 secondo" : `${n} secondi`);

export const TESTI_ACCESSO = {
  titolo: "Accedi all’area riservata",
  descrizione: "Usa le credenziali del tuo account Equia.",
  username: "Nome utente",
  password: "Password",
  entra: "Accedi",
  accessoInCorso: "Accesso in corso…",
  recupera: "Hai dimenticato la password?",
  torna: "Torna all’accesso",
  scaduta: "La sessione è scaduta o non è più valida. Accedi di nuovo per riprendere dalla pagina che avevi aperto.",
  aggiornata: "Password aggiornata. Accedi con le nuove credenziali.",
  attesa: (secondi) => `Puoi riprovare tra ${durata(secondi)}.`,
  troppiTentativi: "Troppi tentativi di accesso. Attendi prima di riprovare.",
  attesaTerminata: "Ora puoi riprovare ad accedere.",
  verificaSessione: "Verifica dell’accesso",
  verificaInCorso: "Verifica della sessione in corso…",
  riprova: "Riprova",
  // Passo del secondo fattore, per metodo in corso (lo dice il server).
  passi: {
    email: { titolo: "Verifica il tuo accesso", descrizione: "Inserisci il codice che ti abbiamo inviato via email." },
    email_accesso: {
      titolo: "Verifica la tua email",
      descrizione: "Il tuo account non ha ancora un metodo di verifica: ti abbiamo inviato un codice all’indirizzo in anagrafica. Confermandolo, l’email risulterà verificata e potrai entrare.",
    },
    totp: { titolo: "Verifica il tuo accesso", descrizione: "Inserisci il codice mostrato dall’app di autenticazione." },
    passkey: { titolo: "Verifica il tuo accesso", descrizione: "Conferma con la passkey sul tuo telefono." },
  },
  notaTotp: "Il codice cambia ogni 30 secondi: inserisci quello mostrato adesso.",
  passkey: {
    riprova: "Riprova con il telefono",
    inCorso: "In attesa del telefono…",
    istruzioni: "Il browser ti mostrerà un codice da inquadrare, oppure una notifica se il telefono è già collegato. Se Windows propone una chiave USB, premi Cambia e scegli il telefono. Conferma con impronta, volto o PIN.",
    nonSupportata: "Questo browser non supporta le passkey: scegli un altro metodo.",
    annullata: "Operazione annullata o non completata sul telefono. Riprova.",
    giaRegistrata: "Questa passkey è già registrata.",
    dominio: "Il sito non corrisponde a quello per cui la passkey è stata creata.",
    generico: "Verifica con la passkey non riuscita. Riprova.",
  },
  altroMetodo: "Usa un altro metodo",
  scegliMetodo: "Scegli come verificare l’accesso:",
  metodi: { passkey: "Passkey sul telefono", totp: "App di autenticazione", email: "Codice via email" },
};

export const TESTI_PASSWORD = {
  azioneVisibilita: (visibile, etichetta) => `${visibile ? "Nascondi" : "Mostra"} ${etichetta === "Conferma la password" ? "password di conferma" : etichetta.toLowerCase()}`,
  capsLock: "Bloc Maiusc attivo",
  nuova: "Nuova password",
  conferma: "Conferma la password",
  coincidono: "Le password coincidono.",
  diverse: "Le password non coincidono.",
  forza: "Robustezza indicativa",
  lettura: { ok: "requisito soddisfatto", ko: "requisito non soddisfatto", neutro: "requisito da soddisfare", non_verificabile: "verificato al salvataggio" },
  alSalvataggio: "Verificata al salvataggio",
  riepilogo: (soddisfatte, totale, forza) => `${soddisfatte} requisiti su ${totale} soddisfatti. Robustezza: ${forza}.`,
};

export const TESTI_RECUPERO = {
  titolo: "Recupera la password",
  descrizione: "Inserisci l’email associata al tuo account. Ti invieremo un link per scegliere una nuova password.",
  email: "Indirizzo email",
  durata: "Il link è valido per 60 minuti e può essere usato una sola volta.",
  invia: "Invia il link di recupero",
  invioInCorso: "Invio in corso…",
  inviato: "Richiesta inviata",
  // Contratto esistente: stessa frase anche senza risposta dal servizio.
  esito: "Se l'indirizzo è associato a un account riceverai una mail",
  dopoInvio: "Controlla anche la cartella spam. Il link è valido per 60 minuti dalla richiesta.",
};

export const TESTI_RESET = {
  titolo: "Scegli una nuova password",
  descrizione: "Imposta una password personale e confermala per completare il recupero.",
  verifica: "Verifica del link in corso…",
  linkNonValido: "Link non disponibile",
  nuovoLink: "Richiedi un nuovo link",
  istruzioniLink: "Puoi richiedere un nuovo link: quello precedente verrà annullato. Se hai ricaricato questa pagina, riapri il link dalla mail.",
  salva: "Salva la nuova password",
  salvataggio: "Salvataggio in corso…",
  errore: "Non è stato possibile cambiare la password. Richiedi un nuovo link.",
  rete: "Connessione non riuscita. Riprova.",
  motivi: {
    scaduto: "Il link è scaduto: era valido per 60 minuti dalla richiesta.",
    gia_usato: "Questo link è già stato usato: la password è già stata cambiata.",
    non_valido: "Il link non è valido. Può essere stato copiato male, oppure una richiesta più recente lo ha sostituito.",
    rete: "Non è stato possibile verificare il link. Controlla la connessione e riapri il link dalla mail.",
  },
};
