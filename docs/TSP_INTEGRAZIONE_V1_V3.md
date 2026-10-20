# Integrazione V1 e V3 — 20 ottobre 2026

Profilo: release critica, con autenticazione, migrazione e staging.
Responsabile integrazione: Matteo. Repository: app-eqia; sviluppo su
matteogenna, integrazione su main, destinazione eqiastaging.ersaf.it.

## Obiettivo e accettazione

- Revisionare PR 1 Notizie e PR 2 Account, conservandone commit e autori.
- Verificare autorizzazioni, isolamento degli account, transazione di creazione,
  migrazioni e disponibilità persistente degli allegati nello staging.
- Correggere i difetti rilevati e provarli sul MariaDB locale ersaf_test.
- Eseguire il gate completo prima dell'integrazione e del deploy.
- Verificare release, HTTPS, login, Notizie e persistenza dei file.
- Lasciare il checkout su matteogenna; nessuna modifica a Università.

## Confini

V1 consegna servizio e componente riusabili: la scheda anagrafica M1 non è
parte di queste PR. Provider email/SMS restano su file; EduNews esterno resta
disabilitato. Nessun invio a destinatari reali.

## Revisione e verifiche prima del rilascio

- PR #1: `3c28fdf0b03a2063243ec58a2580cb80af10b0f7`.
- PR #2: `9b3000bb5a847c17a8503fc0ffad06629125c97a`, che include già #1.
- Correzioni: revoca delle sessioni alla disattivazione, username univoci
  anche in concorrenza e con nomi lunghi, nomi file speciali, archivio
  persistente e backup degli allegati, componenti Notizie separati.
- Tre regressioni account riprodotte prima delle correzioni; successivamente
  119 test backend, lint, 41 test frontend e build completati. I due test
  frontend sui percorsi sono stati corretti e rieseguiti dopo il primo gate.
- Preflight remoto superato. Prima della 018, zero gruppi di username
  duplicati secondo la collation `utf8mb4_unicode_ci` del database di staging.

## Compatibilità e rilascio

La 017 aggiunge le tabelle Notizie; la 018 aggiunge un indice univoco senza
rinominare utenti. Il codice della release precedente non scrive Notizie
né crea account applicativi: le aggiunte sono compatibili con il suo
rollback applicativo. Il DDL resta applicato anche tornando alle immagini
precedenti; nessun ripristino dati automatico.

API/web vengono fermati prima di backup SQL/allegati e migrazioni. Le PR
vanno integrate nell'ordine #1, #2, quindi le correzioni, preservando i commit
originali. Il deploy parte dal commit risultante su `main`; il checkout
di lavoro resta su `matteogenna`.

L'accettazione finale richiede release e migrazioni effettive, HTTPS e
login OTP, pubblicazione di una notizia sintetica, upload/download e confronto
dell'allegato dopo ricreazione del container API. Il contenuto di prova
viene poi eliminato dall'interfaccia. Email/SMS restano su file.
