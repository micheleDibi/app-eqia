// Testi della sezione EduNews24: modulo in Dashboard e pagina /edunews24.
// "Carica altri", "Caricamento..." e la fine dell'elenco restano in TESTI_ELENCO.

const secondi = (n) => (n === 1 ? "1 secondo" : `${n} secondi`);
const minuti = (n) => (n === 1 ? "1 minuto" : `${n} minuti`);
// Attesa prima di riprovare: la pausa raddoppia fino a un'ora, quindi dai 90
// secondi si conta in minuti, arrotondati per eccesso.
const attesa = (n) => (n >= 90 ? minuti(Math.ceil(n / 60)) : secondi(n));

// Prima parte dell'errore del primo caricamento della pagina, con il genere
// della sezione.
const NON_CARICATE = {
  notizie: "Notizie non caricate",
  interpelli: "Interpelli non caricati",
  "selezione-personale": "Selezione del personale non caricata",
  bandi: "Bandi non caricati",
};

export const TESTI_EDUNEWS24 = {
  nome: "EduNews24",
  titoloPagina: "EduNews24",
  // Presentazione della testata; la seconda frase solo con la funzione attiva.
  presentazione: "Notizie, interpelli, selezioni del personale e bandi dalla redazione di EduNews24.",
  presentazioneTitoli: "Ogni titolo apre l'articolo su EduNews24.",
  fonte: "Fonte: EduNews24",
  nuovaScheda: "(si apre in una nuova scheda)",

  sezioni: { notizie: "Notizie", interpelli: "Interpelli", "selezione-personale": "Selezione personale", bandi: "Bandi" },
  sezioniBrevi: { notizie: "Notizie", interpelli: "Interpelli", "selezione-personale": "Selezione", bandi: "Bandi" },
  etichettaSezioni: "Sezioni di EduNews24",
  vediTutto: {
    notizie: "Tutte le notizie",
    interpelli: "Tutti gli interpelli",
    "selezione-personale": "Tutte le selezioni",
    bandi: "Tutti i bandi",
  },

  etichettaSocial: "EduNews24 sui social",
  social: {
    facebook: "EduNews24 su Facebook",
    instagram: "EduNews24 su Instagram",
    tiktok: "EduNews24 su TikTok",
  },
  socialBrevi: { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok" },

  // Folio: ora dell'ultimo aggiornamento, oppure della copia che si sta vedendo.
  aggiornatoAlle: (ora) => `Aggiornato alle ${ora}`,
  aggiornatoIl: (data, ora) => `Aggiornato il ${data} alle ${ora}`,
  nonAggiornatoDalle: (ora) => `Non aggiornato dalle ${ora}`,
  nonAggiornatoDal: (data, ora) => `Non aggiornato dal ${data} alle ${ora}`,
  // Copia stantia senza l'istante dell'ultimo aggiornamento.
  nonAggiornato: "Contenuti non aggiornati",
  stantioEsteso: "Contenuti non aggiornati: EduNews24 non risponde e stai vedendo l'ultima copia disponibile.",

  // Fascia delle miniature e tabellone del modulo.
  fascia: "Altre notizie di EduNews24",
  precedenti: "Notizie precedenti",
  successive: "Notizie successive",
  inEvidenza: (titolo) => `In evidenza: ${titolo}`,
  tabellone: { interpelli: "Altri interpelli", "selezione-personale": "Altre selezioni", bandi: "Altri bandi" },

  // Pagina: titolo della griglia sotto la prima pagina delle notizie.
  altreNotizie: "Altre notizie",

  // Timbro della voce principale e targa della pagina. "Apre il" solo nel
  // timbro dei bandi: la targa mostra la data, con aperturaSr per i lettori di schermo.
  scadeIl: "Scade il",
  pubblicatoIl: "Pubblicato il",
  etichettaApertura: "Apre il",
  senzaScadenza: "Senza scadenza",
  scadenzaNonIndicata: "Scadenza non indicata",
  scadenzaSr: (data) => `Scadenza: ${data}`,
  aperturaSr: (data) => `Apertura: ${data}`,
  pubblicazioneSr: (data) => `Pubblicato il ${data}`,
  classe: (classe) => `Classe ${classe}`,
  classeSr: (classe) => `Classe di concorso ${classe}`,

  // Distintivi di stato della selezione del personale.
  stati: {
    scaduto: "Scaduto",
    chiuso: "Chiuso",
    scadeOggi: "Scade oggi",
    scadeDomani: "Scade domani",
    scadeTra: (n) => `Scade tra ${n} giorni`,
    aperto: "Aperto",
  },
  // Stati propri dei bandi; gli altri distintivi usano `stati`.
  statiBando: {
    inApertura: "In apertura",
    apreIl: (data) => `Apre il ${data}`,
    sospeso: "Sospeso",
    revocato: "Revocato",
  },

  // Bando con lo stato da verificare: distintivo e frase, per stato e motivo
  // (lib/edunews24.js, daVerificareBando); `generico` fuori da questa tabella.
  daVerificare: {
    etichetta: "Da verificare",
    generico: "Lo stato di questo bando è in verifica: controlla sul sito dell'ente.",
    motivi: {
      "in-apertura": {
        "data-apertura-passata": "La data di apertura annunciata è passata senza conferma: verifica sul sito dell'ente.",
        "smentito-dalla-fonte": "La pagina ufficiale non lo indica più come in arrivo: verifica sul sito dell'ente.",
        "previsione-scaduta": "Il periodo di apertura previsto è passato senza un avviso: verifica sul sito dell'ente.",
        "senza-conferma": "L'apertura è annunciata ma non è confermata dalla fonte ufficiale: verifica sul sito dell'ente.",
      },
      aperto: {
        "smentito-dalla-fonte": "La pagina ufficiale dell'ente non lo indica più come aperto: verifica prima di presentare domanda.",
        "termine-passato": "Un termine di presentazione indicato sembra già passato: verifica sul sito dell'ente.",
        "senza-conferma": "Manca una conferma recente dalla pagina ufficiale dell'ente: verifica prima di presentare domanda.",
      },
    },
  },

  // Metadati.
  nazionale: "Nazionale",
  // Bandi rivolti a tutte le 20 regioni (per esempio gli europei).
  tutteLeRegioni: "Tutte le regioni",
  altreRegioni: (n) => `+${n}`,
  altreRegioniSr: (n, elenco) => `e altre ${n}: ${elenco}`,
  figura: (figura) => `Figura: ${figura}`,
  posti: (n) => `Posti: ${n}`,
  dotazione: (importo) => `Dotazione ${importo}`,
  pubblicatoDallaFonte: (data) => `Pubblicato dall'ente il ${data}`,
  oggi: "Oggi",
  ieri: "Ieri",
  senzaData: "Senza data",

  // Video.
  guardaVideo: "Guarda il video",
  guardaVideoNome: (titolo) => `Guarda il video: ${titolo}`,
  durataEstesa: (m, s) => `durata ${[m ? minuti(m) : "", s ? secondi(s) : ""].filter(Boolean).join(" e ")}`,
  video: "Video",
  videoNonDisponibile: "Il video non si può riprodurre qui.",
  guardaSuEduNews24: "Guardalo su EduNews24",

  // Filtri della pagina.
  categorie: "Categorie",
  tutteLeCategorie: "Tutte",
  soloVideo: "Solo video",
  area: "Area",
  tutteLeAree: "Tutte le aree",
  tuttaItalia: "Tutta Italia",
  regioni: "Regioni",
  filtriAttivi: "Filtri attivi",
  filtroCategoria: (categoria) => `Categoria: ${categoria}`,
  filtroArea: (area) => `Area: ${area}`,
  rimuoviFiltro: (filtro) => `Rimuovi il filtro ${filtro}`,
  rimuoviFiltri: "Rimuovi filtri",
  rimuoviIlFiltro: "Rimuovi il filtro",
  rimuoviIFiltri: "Rimuovi i filtri",
  // Nota sull'area della scheda Bandi: la seconda con "Nazionale" scelto.
  notaAreaBandi: "Scegliendo una regione compaiono anche i bandi nazionali ed europei rivolti a tutte le regioni.",
  notaNazionaleBandi:
    "Con Nazionale compaiono solo i bandi di area nazionale: quelli europei si vedono con Tutte le aree o scegliendo una regione.",

  // Testo nascosto dello scheletro, in role="status".
  caricamento: {
    notizie: "Caricamento delle notizie di EduNews24",
    interpelli: "Caricamento degli interpelli di EduNews24",
    "selezione-personale": "Caricamento della selezione del personale di EduNews24",
    bandi: "Caricamento dei bandi di EduNews24",
  },

  // Stato vuoto del modulo: titolo e riga.
  vuotiModulo: {
    notizie: {
      titolo: "Nessuna notizia da mostrare per ora.",
      riga: "Le nuove notizie di EduNews24 compaiono qui.",
    },
    interpelli: {
      titolo: "Nessun interpello recente.",
      riga: "I nuovi interpelli compaiono qui.",
    },
    "selezione-personale": {
      titolo: "Nessuna selezione aperta in questo momento.",
      riga: "Quelle chiuse o scadute restano nella pagina EduNews24.",
    },
    bandi: {
      titolo: "Nessun bando aperto in questo momento.",
      riga: "Quelli chiusi o scaduti restano nella pagina EduNews24.",
    },
  },

  // Stato vuoto della pagina, senza e con filtri (lib/edunews24.js, testiVuotoPagina).
  vuotiPagina: {
    notizie: {
      titolo: "Nessuna notizia da mostrare per ora.",
      riga: "Le nuove notizie compariranno qui.",
      titoloFiltrato: "Nessuna notizia per questi filtri.",
      rigaFiltrata: "Prova un'altra categoria o rimuovi i filtri.",
      rigaFiltrataUno: "Prova un'altra categoria o rimuovi il filtro.",
    },
    interpelli: {
      titolo: "Nessun interpello da mostrare per ora.",
      titoloArea: (regione) => `Nessun interpello in ${regione}.`,
      rigaFiltrata: "Prova un'altra area o rimuovi il filtro.",
    },
    "selezione-personale": {
      titolo: "Nessuna selezione da mostrare per ora.",
      titoloNazionale: "Nessuna selezione nazionale.",
      titoloArea: (regione) => `Nessuna selezione in ${regione}.`,
      rigaFiltrata: "Prova un'altra area o rimuovi il filtro.",
    },
    bandi: {
      titolo: "Nessun bando da mostrare per ora.",
      titoloNazionale: "Nessun bando nazionale.",
      titoloArea: (regione) => `Nessun bando in ${regione}.`,
      rigaFiltrata: "Prova un'altra area o rimuovi il filtro.",
    },
  },

  // Errori, composti secondo il contesto (lib/edunews24.js). riprovaTra e
  // riprovaPresto sono la nota accanto a "Riprova", nel modulo e al primo
  // caricamento della pagina; l'avviso della pagina non dice i secondi.
  erroreModulo: "EduNews24 non risponde in questo momento.",
  erroreModuloDettaglio: "Il resto della piattaforma funziona normalmente.",
  riprovaTra: (n) => `Puoi riprovare tra ${attesa(n)}.`,
  riprovaPresto: "Puoi riprovare tra qualche istante.",
  errorePagina: (sezione) =>
    `${NON_CARICATE[sezione] ?? NON_CARICATE.notizie}: EduNews24 non risponde in questo momento.`,
  erroreAltre: "Altre voci non caricate: EduNews24 non risponde.",
  filtroNonValido: "Questo filtro non è più disponibile.",
  ripartito: "L'elenco è stato aggiornato: riparte dalle voci più recenti.",
  // Prima pagina senza voci da mostrare ma con un seguito da caricare.
  vociSuccessive: "Nessuna voce da mostrare in questa parte dell'elenco: carica le successive.",
  cursore: "L'elenco di EduNews24 è cambiato mentre lo scorrevi. Ricaricalo dalla prima pagina.",
  riprova: "Riprova",

  // Funzione disattivata.
  disattivataTitolo: "EduNews24 non è attivo su questa piattaforma.",
  disattivata: "Quando verrà attivato, qui troverai notizie, interpelli, selezioni del personale e bandi.",

  // Annunci nascosti dopo un cambio chiesto dall'utente: filtri della pagina,
  // "Riprova" del modulo.
  annunci: { aggiornato: "Elenco aggiornato", vuoto: "Nessuna voce trovata" },

  // BandoFit: riquadro della pagina (titolo e testo) e striscia del modulo
  // (testoBreve, solo quando c'è spazio).
  bandoFit: {
    nome: "BandoFit",
    titolo: "Supporto alla candidatura",
    testo: "Verifica i requisiti e prepara la domanda con i progettisti di BandoFit.",
    testoBreve: "Prepara la domanda con i progettisti di BandoFit.",
    link: "Vai a BandoFit",
  },

  // Condividi delle notizie della pagina: nome del pulsante ed esito.
  condividi: {
    comando: "Condividi",
    nome: (titolo) => `Condividi: ${titolo}`,
    copiato: "Link copiato",
    errore: "Link non copiato",
  },
};
