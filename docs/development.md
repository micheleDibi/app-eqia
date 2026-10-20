# Sviluppo

Stack: FastAPI, SQLAlchemy, MariaDB 10.11, React, Vite, Tailwind e Lucide.
Ambiente verificato: Windows, PowerShell, Python 3.14.7, Node 24.19.0 e
Docker Compose. Dipendenze Python fissate in `backend/requirements.txt`,
dipendenze frontend bloccate in `frontend/package-lock.json`.

## Primo avvio

Dal proprio clone del repository, con Docker Desktop avviato:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
npm ci --prefix frontend
python scripts/configura_locale.py
docker compose up -d --wait db
Push-Location backend
.venv/Scripts/python.exe scripts/inizializza_db.py
.venv/Scripts/python.exe scripts/crea_accesso_locale.py
Pop-Location
```

`configura_locale.py` genera segreti nuovi e rifiuta di sovrascrivere `.env`
o `backend/.env`. Nessuna configurazione o password va copiata da Università.
Il bootstrap crea solo schema, template tecnici e catalogo ruoli; non importa
persone, centri, account o altri dati del gestionale di origine.

Il comando `crea_accesso_locale.py` crea un solo account Nazionale sintetico,
se il database di sviluppo non contiene già utenti. Le credenziali generate
si trovano in `backend/var/accesso-locale.txt`, escluso dal versionamento.
Questo comando serve esclusivamente allo sviluppo e non è la funzione di
creazione interna degli account da realizzare nel pacchetto V1.

## Servizi locali

In un terminale, dalla cartella `backend`:

```powershell
.venv/Scripts/python.exe -m uvicorn src.main:app --host 127.0.0.1 --port 8010 --reload
```

In un secondo terminale, dalla cartella `frontend`:

```powershell
npm run dev -- --host localhost
```

Aprire `http://localhost:5180`. Il frontend inoltra `/api` all'API locale;
non occorre configurare un URL nel codice dei moduli.
La salute del processo è esposta su `http://127.0.0.1:8010/salute`;
non è una verifica completa di database e provider.

Al primo accesso del Nazionale viene richiesto il codice inviato alla sua
email sintetica. Aprire l'ultimo `.eml` in `backend/var/email_dev`.
I messaggi SMS locali finiscono in `backend/var/sms_dev`.
Nessun invio reale è configurato. EduNews usa un backend in memoria con
contenuti e indirizzi di prova `.invalid`.

| Servizio | Indirizzo | Dati |
|---|---|---|
| Frontend | `localhost:5180` | UI locale |
| Backend | `127.0.0.1:8010` | API locale |
| MariaDB sviluppo | `127.0.0.1:3318`, `eqia_dev` | Volume Docker `eqia_database` |
| MariaDB test | `127.0.0.1:3319`, `ersaf_test` | Servizio `db-test`, memoria temporanea |

Per fermare i database senza eliminare il volume di sviluppo:
`docker compose --profile test stop`.

## Migrazioni

`inizializza_db.py` accetta soltanto le due combinazioni locali di database e
porta riportate sopra. Rifiuta database popolati privi del registro migrazioni.
Memorizza il digest dei file applicati; una migrazione già applicata non va
riscritta. Aggiungere un nuovo file e concordare le variazioni ai modelli comuni.

La numerazione conserva quella delle migrazioni riutilizzate, con intervalli
voluti: non aggiungere le migrazioni escluse del gestionale di origine.
Il DDL MariaDB non è interamente transazionale: in caso di errore di
migrazione, verificare lo stato prima di riprovare. Questo bootstrap è locale;
non costituisce una procedura di rilascio o rollback dello staging.
Il deploy riusa il medesimo motore e registro, attraverso un ingresso distinto
con controlli sulla destinazione e sul TLS; vedere [deploy.md](deploy.md).

## Verifiche

Dalla radice, dopo il primo avvio:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-local.ps1
```

Il comando avvia solo il database di test, esegue pytest e poi lint, test
frontend e build. La suite distrugge e ricrea esclusivamente `ersaf_test`
sul servizio dedicato alla porta 3319. Non utilizzare dati reali, dump,
URL di Università o database di collaudo.

Comandi separati, utili per la tranche del singolo sviluppatore:

```powershell
docker compose --profile test up -d --wait db-test
Push-Location backend
.venv/Scripts/python.exe -m pytest -q
Pop-Location
Push-Location frontend
npm run lint
npm test
npm run build
Pop-Location
```

Le prove della base coprono catalogo ruoli, sessione, CSRF/origine, obbligo OTP
del Nazionale, esclusione dei vecchi ruoli, visibilità della rete, cookie
indipendenti, isolamento delle migrazioni e assenza delle rotte fuori perimetro.
La prova browser locale copre accesso OTP, dashboard, menu compatto, profilo,
schermata sicurezza, EduNews e logout.

Verifica del 20 ottobre 2026, inclusi i confini del deploy: 37 test backend e 2 test frontend
superati, lint senza errori e build Vite completata. Prova browser eseguita
con un account sintetico, email su file e sorgente EduNews in memoria.

Questi controlli non chiudono i pacchetti di sviluppo: recupero completo,
creazione e attivazione dall'anagrafica, authenticator e passkey su dispositivo
richiedono la consegna e le prove di Vincenzo. Elenchi e schede anagrafiche e
Notizie sono ancora sezioni da completare.

## Staging

Destinazione: `https://eqiastaging.ersaf.it`. Il contratto operativo unico è
`deploy/staging.json`; i file contenenti segreti vengono generati sul server.
Comandi di rilascio, isolamento, provider e ripristino in [deploy.md](deploy.md).
Lo staging usa un database nuovo; non usare servizi o segreti di Università.
