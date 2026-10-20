export const TESTI_ELENCO = {
  apriAvvisi: "Mostra gli avvisi dell’anagrafica",
  errori: (n) => (n === 1 ? "1 errore" : `${n} errori`),
  risultati: (n) => (n === 1 ? "1 risultato" : `${n} risultati`),
  gruppoFiltri: "Filtri dell'elenco",
  nomeFiltri: "Filtri",
  chiudiFiltri: "Chiudi filtri",
  azzeraFiltri: "Azzera filtri",
  filtri: (attivi) => attivi ? `Filtri (${attivi})` : "Filtri",
  ruolo: "Ruolo",
  // Voce del filtro Ruolo che non filtra; le altre sono i valori dell'API
  // (RUOLI_FILTRO in config/elenchi.js).
  tuttiRuoli: "Tutti i ruoli",
  universita: "Università",
  tipoCorso: "Tipo di corso",
  statoProdotto: "Stato del prodotto",
  // Testata e stato vuoto degli elenchi dei clienti. `nuovo` e' l'etichetta
  // visibile del pulsante, `nuovoEsteso` il suo nome accessibile.
  clienti: {
    attuatori: {
      titolo: "Attuatori",
      nuovo: "Nuovo",
      nuovoEsteso: "Nuovo attuatore",
      segnaposto: "Cerca per nome, cognome o centro",
      vuoto: "Nessun attuatore trovato.",
    },
    sottoscrittori: {
      titolo: "Sottoscrittori",
      nuovo: "Nuovo",
      nuovoEsteso: "Nuovo sottoscrittore",
      segnaposto: "Cerca per nome o cognome",
      vuoto: "Nessun sottoscrittore trovato.",
    },
  },
  // Righe: nome accessibile della riga, colonna del chevron (solo per i
  // lettori di schermo) e ripieghi quando il campo principale e' vuoto.
  visualizza: (nome) => `Visualizza ${nome}`,
  colonnaAzioni: "Azioni",
  praticaSenzaNumero: (id) => `Pratica #${id}`,
  elementoSenzaNome: "Elemento",
  // Piede dell'elenco.
  caricamento: "Caricamento…",
  fineElenco: "Hai raggiunto la fine dell'elenco",
  caricaAltri: "Carica altri elementi",
  riprova: "Riprova",
  // Etichette della colonna "Verifiche" dei clienti: `voce` e' il testo
  // visibile, `si` e `no` il tooltip e il testo per i lettori di schermo.
  indicatori: {
    email: { voce: "Email", si: "Email verificata", no: "Email non verificata" },
    cellulare: { voce: "Cellulare", si: "Cellulare verificato", no: "Cellulare non verificato" },
    diploma: { voce: "Diploma", si: "Dati diploma completi", no: "Dati diploma incompleti" },
  },
};
