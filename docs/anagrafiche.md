# Attuatori, sottoscrittori e centri

Stato del 21 ottobre 2026: tranche M1/M2 implementata e verificata in locale.
La pubblicazione in staging viene registrata separatamente in `deploy.md`.

## Funzioni

- Elenchi separati, ricerca per parole, filtri per ruolo e centro, paginazione.
- Schede di creazione e modifica con dati personali, documento, residenza,
  domicilio, recapiti e collegamenti. Copia della residenza nel domicilio.
- Scheda Account collegata al componente V1 esistente per verifica dei recapiti
  e stato dell'account. Nessuna password nel modulo anagrafico.
- Centri con dati amministrativi, sede, recapiti, coordinate bancarie,
  centro superiore, sottocentri e collegamenti alle persone del centro.

Dashboard vuota e confini di V1, V2, Notizie ed EduNews invariati.

## Ruoli e visibilità

Il catalogo `shared/ruoli.json` rimane la fonte dei quattro ruoli.

| Ruolo | Attuatori | Sottoscrittori | Centri |
|---|---|---|---|
| Nazionale | Tutti; assegna i quattro ruoli | Tutti | Tutti; modifica identità e gerarchia |
| Business | Rete visibile; crea e modifica i due Startup | Rete visibile | Rete visibile; crea centri e modifica sede/recapiti |
| Startup | Nessuna amministrazione | Rete visibile | Solo selezione dei centri visibili nelle anagrafiche |
| Startup for Education | Nessuna amministrazione | Rete visibile | Solo selezione dei centri visibili nelle anagrafiche |

La visibilità delle persone riusa `auth/visibilita.py`, compresa la regola
dei discendenti propri e dei colleghi del centro. Essere nello stesso centro
non rende automaticamente visibile l'anagrafica del collega.
I centri visibili sono quelli associati alle persone della rete, quelli creati
dalla rete e i loro sottocentri. Le selezioni remote applicano gli stessi limiti.
Un identificativo non visibile ha la stessa risposta di uno inesistente.

Il sottoscrittore ha ruolo nullo: non è un quinto ruolo e non può accedere al
gestionale. Il cambio di tipo non è previsto dalla scheda. Il ruolo di un
attuatore può cambiare solo entro il catalogo assegnabile; non è possibile
cambiare il proprio ruolo. Un cambio di ruolo revoca le sessioni del destinatario.

## Account e collegamenti

Creazione di utente, anagrafica e attesa di attivazione nella stessa transazione,
attraverso `account.creazione.crea_account`. La creazione non invia messaggi.
La verifica dei recapiti e l'attivazione restano nei servizi V1.
Gli identificativi `cliente_id` e `utente_id` restano distinti.

Il referente della rete usa l'identificativo dell'utente, determina la gerarchia
di visibilità e parte dall'autore della creazione. Solo il Nazionale può cambiarlo.
L'attuatore di riferimento del sottoscrittore usa invece l'identificativo
dell'anagrafica: è un'associazione distinta e non sposta la gerarchia dell'account.
I collegamenti verso persone e centri devono essere visibili al chiamante.
Le gerarchie di account e centri rifiutano collegamenti ciclici.

Il codice dell'anagrafica, il codice del centro e lo username sono assegnati
dal server e rimangono stabili durante le modifiche. I payload ammettono solo
i campi del modulo, escludendo password, stato account e flag di verifica.
Codice fiscale, recapiti e identificativi duplicati vengono rifiutati.

## Punti comuni

`backend/src/gestione` centralizza contesto, autorizzazioni derivate dal catalogo,
validazioni, ricerca e selettori. I router delle persone e dei centri restano
nei rispettivi moduli. Gli elenchi restituiscono solo i campi di riepilogo;
i dati completi sono letti dalla scheda.

`frontend/src/components/gestione` compone liste e schede con i controlli comuni.
Definizioni dei campi, testi, endpoint, rotte, colonne e stili sono in `config`;
il trasporto passa da `lib/api.js`. Ricerca, filtri e scheda attiva sono nell'URL.
Il ritorno dalla scheda conserva i filtri dell'elenco. Tabella su schermi ampi,
lista continua su schermi stretti, senza avatar o schede decorative ripetute.

La migrazione `019_gestione_centri.sql` aggiunge centro superiore e autore
del centro con chiavi esterne. Non importa dati e non modifica il ruolo delle
anagrafiche esistenti. Richiede l'applicazione prima dell'avvio del nuovo backend.

## Verifiche del 21 ottobre 2026

Gate locale superato: 160 test backend sul MariaDB usa-e-getta dedicato,
48 test frontend, lint e build. I 41 nuovi casi `test_gestione_*` coprono
creazione atomica, duplicati, payload riservati, confini dei quattro ruoli,
isolamento delle reti, cicli, paginazione e ciclo V1 fino all'accesso.

Browser sui servizi reali locali con soli dati sintetici: creazione e modifica
dei tre tipi di anagrafica, associazione al centro, sottocentri, attuatore di
riferimento e referente della rete; ricerca per parole, filtri nell'URL e
ritorno all'elenco filtrato anche dopo una nuova creazione. Verificate le viste a 390 e 1440 px e le linguette
da tastiera. Email e SMS sono stati scritti soltanto su file locali.

La prova di attivazione verifica entrambi i recapiti, la consegna delle
credenziali locali e l'accesso dell'attuatore Startup, che vede i sottoscrittori
della propria rete e può crearne altri. Durante l'integrazione è stata
corretta l'apertura iniziale di `SezioneAccount`: la finestra di conferma viene
montata solo quando esiste un'azione da confermare, evitando una lettura nulla
nel codice generato dal compilatore React. Apertura e annullamento della
conferma verificati nel browser; lint, test frontend e build ripetuti dopo
la correzione. Resta l'avviso Vite sul bundle oltre 500 kB.
