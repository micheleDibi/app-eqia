# Staging Eqia

## Destinazione e isolamento

Il contratto operativo è `deploy/staging.json`: dominio, macchina, porta,
progetto Compose, directory e identità del database si modificano lì.
Destinazione: `https://eqiastaging.ersaf.it`, server applicativo
`192.168.40.12:18083`, reverse proxy `192.168.40.10`.

Lo stack `ersaf-eqia-staging` vive in `/srv/ersaf-eqia`. MariaDB è nuovo:
nessuna copia di dati, volumi, segreti o configurazioni private di Università.
Non pubblica la porta del database. Le reti di API e database sono interne;
la porta web sulla LAN accetta soltanto il reverse proxy. Una unit systemd
riapplica le due regole dedicate dopo il riavvio di Docker.

Il database usa TLS con verifica di CA e nome `db`; la CA privata è autonoma.
Immagini e allegati Notizie usano la cartella persistente `state/notizie`,
montata sull'API. Il Compose dello staging imposta esplicitamente il backend
`cartella`; nessun collegamento FTP esterno è richiesto.
Il certificato database dura due anni: sostituirlo prima della scadenza,
conservando la CA o coordinando anche la sostituzione della fiducia nell'API.
Il certificato HTTPS pubblico è gestito e rinnovato da Nginx Proxy Manager.

## Comandi

Prerequisiti: Git, OpenSSH, PowerShell e alias SSH `ersaf-12` autorizzato
sul server. Per le verifiche locali valgono i prerequisiti di development.md.
Lo script non modifica chiavi SSH o autorizzazioni degli sviluppatori.
Il trasferimento usa il protocollo SCP su SSH (`scp -O`): nella verifica
dell'ambiente il trasferimento con SFTP non terminava.

```powershell
# Verifiche del codice prima del rilascio
./scripts/verify-local.ps1

# Controlli remoti senza installazione
./scripts/deploy.ps1 -Action preflight

# Prima installazione: schema e segreti nuovi
./scripts/deploy.ps1 -Action install

# Rilasci successivi del commit pubblicato su origin/main
./scripts/deploy.ps1 -Action deploy

./scripts/deploy.ps1 -Action status
./scripts/deploy.ps1 -Action verify
./scripts/deploy.ps1 -Action logs
./scripts/deploy.ps1 -Action backup-db
```

`install` e `deploy` usano la stessa procedura idempotente di preparazione
dell'ambiente. I segreti già presenti non vengono rigenerati.
Il checkout deve essere pulito. Lo script aggiorna `origin/main`, produce un
archivio dal commit e include solo i percorsi di prodotto necessari.
`-Ref` permette di selezionare un diverso commit esplicito.
Ogni archivio viene verificato con SHA-256; `RELEASE_INFO` registra commit
completo, identificativo della release e ora UTC.

Il server compila immagini API/web separate, avvia il solo database Equia,
ferma l'eventuale API/web precedente, salva e verifica un backup compresso,
applica le migrazioni mancanti e verifica l'avvio prima di aggiornare `current`.
Il backup comprende anche un archivio separato degli allegati Notizie, con
verifica gzip e SHA-256. Prima dell'attivazione viene verificata la lettura e
scrittura della cartella tramite l'API.
Il blocco esclusivo impedisce due deploy contemporanei.
Non sono previste pulizie automatiche di immagini, volumi, release o backup.

## Database e ripristino

Il registro `schema_versioni` e il motore di migrazione sono gli stessi del
bootstrap locale. Una migrazione già applicata con digest diverso viene
rifiutata. Il comando locale continua a rifiutare qualsiasi database remoto;
quello di staging richiede container, database, utente, origine e TLS esatti.

Il DDL MariaDB non è interamente transazionale. Se una migrazione fallisce,
lo script si interrompe e lascia API/web fermi: verificare il database e il
backup prima di ripetere il rilascio. Nessun ripristino dati automatico.
Se fallisce l'avvio, `current` non viene promosso alla release nuova;
leggere i log e scegliere esplicitamente il ripristino appropriato.

```powershell
./scripts/deploy.ps1 -Action rollback -Release IDENTIFICATIVO_RELEASE
```

Il rollback riavvia immagini già compilate di una release conservata, dopo
un nuovo backup. **Non annulla le migrazioni**: chi rilascia deve verificare la
compatibilità del vecchio codice con lo schema corrente. Un ripristino dati
richiede una procedura separata e valutazione delle scritture successive.

## Servizi e primo accesso

La configurazione generata in `shared/api.env` usa `ERSAF_ENV=sviluppo` per
il collaudo con email/SMS su file, senza invii reali. L'origine HTTPS mantiene
cookie `__Host-eqia_sessione` Secure/HttpOnly e verifiche CSRF/origine.
TLS MariaDB viene comunque richiesto e verificato, anche in questa modalità.
EduNews esterno è inizialmente disabilitato; nessun dato inventato è presentato
come notizia reale. SMTP, SMS ed eventuale uscita verso provider vanno
configurati e verificati in una successiva attività dedicata.

Finché il provider email resta su file e host/utente/password SMTP sono vuoti,
il solo staging precompila il codice email di login dopo la password corretta.
Resta necessario premere «Conferma codice»; limiti, scadenza e uso singolo
restano attivi. Non è un secondo fattore indipendente in questa modalità.
Impostare `EMAIL_BACKEND=smtp` e i parametri SMTP in `shared/api.env`, quindi
ridistribuire l'API, disattiva la precompilazione senza modifiche frontend.
Anche la sola presenza di host o credenziali SMTP la disabilita. La policy non
si estende a contatti, recupero password, authenticator o passkey; vedere
[ADR 0003](adr/0003-accesso-dimostrativo-staging.md).

Il deploy inizializza schema, template e quattro ruoli, senza utenti.
Per il solo collaudo iniziale di un database vuoto:

```powershell
./scripts/deploy.ps1 -Action crea-accesso
```

Il comando crea `nazionale.staging`, account sintetico con password casuale;
rifiuta un database contenente già utenti. Non sostituisce il servizio di
creazione account interno previsto nel pacchetto V1.
Le credenziali sono in `/srv/ersaf-eqia/state/accesso/credenziali.txt`;
i codici OTP arrivano nei file riservati di `state/email`.
Leggerli solo tramite accesso server autorizzato; non copiarli in Git o ticket.

| Percorso sotto `/srv/ersaf-eqia` | Contenuto |
|---|---|
| `shared` | Segreti e certificati; accesso riservato |
| `state/mariadb` | Dati persistenti del solo database Equia |
| `state/email`, `state/sms`, `state/accesso` | Materiale riservato di collaudo |
| `state/notizie` | Immagini e allegati persistenti; accesso tramite API autorizzate |
| `releases` | Sorgenti e metadati dei rilasci |
| `current`, `previous` | Release confermata e precedente |
| `snapshots` | Backup SQL e allegati compressi, con relative impronte |
| `incoming` | Archivi di rilascio trasferiti |

## Reverse proxy e verifica pubblica

In Nginx Proxy Manager l'host del dominio va inoltrato in HTTP alla macchina
e porta definite dal contratto. Attivare certificato valido per il dominio,
Force SSL e HTTP/2; lasciare disattivata la cache del proxy.
Il deploy successivo aggiorna i container dietro questa destinazione stabile,
senza intervenire sugli host degli altri applicativi.

`verify` controlla salute web/API, risposta 401 senza sessione, database TLS,
quattro ruoli e regola firewall. Va completato con verifica HTTPS dal client,
accesso e logout nel browser, controllo del cookie e confronto dei servizi
preesistenti. La sola rotta `/salute` non prova database, provider o login.

## Stato verificato il 20 ottobre 2026

Prima pubblicazione verificata su `https://eqiastaging.ersaf.it`, con redirect
HTTP 301 verso HTTPS e certificato Let's Encrypt valido. Release iniziale
`20261020-095530-c99ae9df`, sorgente
`c99ae9df1b3f2e01a7a3713a4809b4b912f93a89`.

Alla prima pubblicazione i tre container erano sani e il database conteneva
15 migrazioni, quattro ruoli e un solo account sintetico. La connessione MariaDB usa TLS verificato
(`TLS_AES_256_GCM_SHA384`). API e database non espongono porte sull'host;
la porta web sulla LAN è raggiungibile solo dal reverse proxy.

Verificati installazione, deploy ripetuto senza riapplicare le migrazioni,
backup compressi con impronta e rollback applicativo tra due release dello
stesso commit. Il rollback non costituisce una prova di ripristino dei dati
né di compatibilità con un futuro schema diverso.

Nel browser sono passati login con OTP, dashboard, lettura del profilo e
logout. Verifica HTTP aggiuntiva: sessione autenticata 200, cookie
`__Host-eqia_sessione` Secure/HttpOnly/SameSite=Lax senza Domain, logout
senza CSRF rifiutato con 403, logout con CSRF 204 e sessione successiva 401.
Il certificato HTTPS e il redirect sono stati verificati dal client.

I servizi Università e Universo preesistenti sono rimasti operativi.
Email/SMS restano su file e l'integrazione EduNews esterna resta disabilitata,
come indicato sopra. Le prove iniziali riguardavano l'ambiente e l'accesso;
la consegna V1/Notizie è verificata separatamente di seguito.

### Integrazione V1 e Notizie

PR #1 e #2 unite nell'ordine, preservando i commit originali; correzioni
integrate da `matteogenna`. Release distribuita e verificata:
`20261020-151309-426836c3`, commit
`426836c326bcea22ca0635b4126dc07fdebc8150`.

Trasferimento `scp -O`, build delle immagini e attivazione completati.
Migrazioni 017 e 018 applicate: 17 migrazioni totali e indice
`uq_utenti_username` presente. Nessun doppione prima della migrazione.
Backup SQL e archivio allegati compressi verificati; il backup successivo
alla prova include il file caricato dal browser.

Verificati HTTPS 200 con certificato valido, redirect HTTP 301, API salute
200, sessione anonima 401, database TLS e tre container sani.
Login OTP e logout nel browser riusciti. In Notizie sono passati creazione
di sezione/argomento, pubblicazione, upload e download. Dopo ricreazione
dei container API/web, sessione, notizia e allegato sono rimasti disponibili:
il download ha gli stessi byte e lo stesso SHA-256 dell'originale.

La notizia sintetica è stata eliminata dall'interfaccia; sezione e argomento
di collaudo sono disattivati. Il file resta nell'archivio secondo la policy
del modulo, che non elimina fisicamente gli allegati.
Email e SMS sono ancora su file, EduNews esterno disabilitato.
Un solo account sintetico; nessuna nuova anagrafica.

V1 consegna API, servizio di creazione e componente riusabile. Il ciclo
account nelle schede anagrafiche richiede M1, fuori da questo rilascio;
V2 e prove di authenticator/passkey su dispositivo non sono incluse.

## Anagrafiche e centri - 21 ottobre 2026

M1/M2 sviluppati su `matteogenna`, integrati in `main` con avanzamento lineare
e pubblicati dal commit `8d03254ad12bf177684d4cce873fe9b46046c5e8`.
Release attiva: `20261021-085433-8d03254a`.
Dettaglio funzionale e prove locali in [anagrafiche.md](anagrafiche.md).

Il gate locale ha superato 160 test backend, 48 test frontend, lint e build.
Le correzioni emerse nel browser sono state ricontrollate con lint, test
frontend e build. Preflight remoto, trasferimento, build e attivazione sono
completati. Backup SQL e allegati verificati prima della migrazione:
`20261021-085500-20261021-085433-8d03254a.sql.gz` e relativo archivio file.

La migrazione `019_gestione_centri.sql` è applicata: 18 migrazioni totali,
colonne `azienda_padre_id` e `azienda_created_by` presenti. È additiva;
l'eventuale rollback applicativo conserva queste colonne e non ripristina dati.
Database TLS, quattro ruoli e isolamento verificati dalla procedura di rilascio.
I tre container Equia sono sani. I servizi Università e Universo preesistenti
risultano operativi, senza riavvii dovuti a questa pubblicazione.

Sul dominio pubblico: HTTPS 200 con certificato valido, redirect HTTP 301,
salute API 200 e sessione anonima 401. Nel browser sono passati login OTP,
elenco e scheda attuatore, sezione Account, apertura dei moduli sottoscrittore
e centro, logout; nessun errore nuovo in console.

Le scritture e il ciclo completo di creazione/attivazione sono stati provati
sul database locale con dati sintetici, anche con ruolo Startup. In staging
la prova delle nuove anagrafiche è stata in sola lettura: resta un solo utente,
la relativa anagrafica preesistente e nessun centro. Email e SMS restano su
file; EduNews esterno è disabilitato. V2 non è incluso in questa release.
