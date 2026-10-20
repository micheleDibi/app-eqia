# Staging Equia

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
Il certificato database dura due anni: sostituirlo prima della scadenza,
conservando la CA o coordinando anche la sostituzione della fiducia nell'API.
Il certificato HTTPS pubblico è gestito e rinnovato da Nginx Proxy Manager.

## Comandi

Prerequisiti: Git, OpenSSH, PowerShell e alias SSH `ersaf-12` autorizzato
sul server. Per le verifiche locali valgono i prerequisiti di development.md.
Lo script non modifica chiavi SSH o autorizzazioni degli sviluppatori.

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
| `releases` | Sorgenti e metadati dei rilasci |
| `current`, `previous` | Release confermata e precedente |
| `snapshots` | Backup SQL compressi e relative impronte |
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
