# Responsabilità e punti di integrazione

## Matteo

Base del progetto; database e migrazioni; cataloghi `shared/`; modelli account,
anagrafiche e centri; autorizzazioni e visibilità; navigazione comune; tema,
icone e componenti condivisi; rimozione dei moduli fuori perimetro; integrazione.
Tranche M1/M2: elenchi e schede attuatori, sottoscrittori e centri.

## Vincenzo

Ciclo account completo: servizio di creazione interna, attivazione e consegna
credenziali, verifica contatti, login/logout, recupero password, profilo e 2FA;
relative pagine, hook, servizi e prove funzionali. Nessuna registrazione pubblica.
Area Notizie ed EduNews e relative API.

La base comune riutilizza parti dei flussi esistenti. Questo riuso non equivale
alla consegna funzionale dei pacchetti sotto: Vincenzo mantiene la responsabilità
di adattamento, integrazione con la creazione interna e verifica dei propri flussi.
Le due tranche si sviluppano sia lato frontend sia lato backend.

## Confini

| Ambito | Owner |
|---|---|
| `shared/`, `db/`, `scripts/`, `compose.yml` | Matteo |
| `backend/src/auth/ruoli.py`, `autorizzazioni.py`, `visibilita.py`, `aree.py` | Matteo |
| Modelli `clienti`, `utenti`, `aziende`, `ruolo` | Matteo |
| `backend/src/account/`, `auth/` esclusi i quattro file sopra; `security/`, `mfa/`, `otp/`, `notifiche/`, `profilo/` | Vincenzo |
| `backend/src/edunews24/`, `backend/src/notizie/` | Vincenzo |
| `backend/src/main.py`, `rotte.py`, `config.py`, database e bootstrap | Matteo |
| `frontend/src/components/accesso/`, `profilo/`, `account/`; `Login.jsx`, `PasswordDimenticata.jsx`, `ReimpostaPassword.jsx`, `MioProfilo.jsx` | Vincenzo |
| `frontend/src/components/edunews24/`, `notizie/`; hook, lib e testi/stili specifici di account, profilo, accesso e informazione | Vincenzo |
| `frontend/src/config/routes/`, tema/token, icone, `components/shared/`, shell, `App.jsx`, trasporto HTTP `lib/api.js`, utilità comuni | Matteo |
| `frontend/src/lib/sessione.js`, `logout.js`, `ritornoAccesso.js`, `hooks/useSessione.js`; gli altri file della shell restano comuni | Vincenzo |
| Configurazione della suite e fixture comuni; test dei cataloghi e della base | Matteo |
| Test del singolo modulo | Chi modifica il modulo |

Il modulo Notizie ha già due ingressi collegati: `backend/src/notizie/routers.py`
(prefisso `/notizie`, autenticazione richiesta) e
`frontend/src/components/notizie/PaginaNotizie.jsx` (URL `/notizie`).
La PR #1 aggiunge elenco e scheda, gestione sezioni/argomenti, destinatari
per ruolo, immagini, allegati e contatore delle notizie da leggere.
Il riquadro della dashboard è disponibile come componente, ma la dashboard
resta vuota. EduNews esterno non viene abilitato da questa consegna.

Per una variazione a contratti, modello dati o file comuni, aprire prima una
PR piccola di contratto e farla integrare a Matteo; non introdurre copie
alternative delle policy. I router di nuovi moduli passano dallo stesso
responsabile dell'integrazione.

Ogni sviluppatore usa il proprio checkout. Matteo lavora su `matteogenna`
e integra su `main`; i rami delle PR di Vincenzo restano separati.
Una PR deve contenere un modulo coerente, relativi test e limiti conosciuti.
Matteo integra le PR verificate. Nessun deploy implicito nel merge.

La PR #2 consegna la firma V1 documentata nel contratto account, il cambio di
stato e la sezione account riusabile. Matteo collega queste superfici alle
anagrafiche M1 nella relativa tranche, senza duplicare i servizi.
V2 resta fuori dall'integrazione delle PR #1 e #2.

## Pacchetti di consegna

| Pacchetto | Responsabile | Risultato verificabile |
|---|---|---|
| M1 | Matteo | Attuatori e sottoscrittori: elenchi e schede, riuso comune, collegamento al ciclo account |
| M2 | Matteo | Centri, associazioni e gerarchie; permessi e visibilità coerenti su API e UI |
| M3 | Matteo | Controllo del perimetro, integrazione delle tranche e verifica complessiva |
| V1 | Vincenzo | Creazione account interna e attivazione, verifica email/cellulare, consegna credenziali |
| V2 | Vincenzo | Accesso, recupero, profilo, OTP/authenticator/passkey e casi di errore completi |
| V3 | Vincenzo | Notizie ed EduNews, contenuti e sorgenti concordati, filtri e stati della UI |

La preparazione iniziale è una base comune. La divisione tiene insieme le
anagrafiche, oggi accoppiate, e assegna a Vincenzo flussi completi invece di sole
rifiniture. Matteo mantiene il blocco più ampio e l'integrazione.

Il [contratto account/anagrafica](contratti-account.md) è il primo punto di incontro.
Per il ruolo Business si applica il catalogo condiviso: gestisce i due tipi Startup
nella propria rete; l'assegnazione di Business e Nazionale resta al Nazionale.
Non reintrodurre distinzioni Provinciale/Regionale all'interno dei moduli.

## Consegna del 20 ottobre 2026

PR #1 Notizie e #2 V1 account integrate su `main` e pubblicate nello staging;
release e prove in [deploy.md](deploy.md#integrazione-v1-e-notizie).
Il contratto V1 è disponibile per M1. Questo esito non completa le schermate
anagrafiche, il pacchetto V2 o l'attivazione di EduNews esterno.

## Tranche del 21 ottobre 2026

M1/M2 implementati su `matteogenna` e verificati localmente:
[anagrafiche e centri](anagrafiche.md). Le schede richiamano il servizio di
creazione e il componente account di V1. Un intervento circoscritto in
`SezioneAccount` corregge la lettura della conferma assente durante il primo
render; servizi e contratti V1 restano invariati. V2 ed EduNews esterno restano
fuori da questa tranche. Per M3 sono eseguiti i controlli di questa integrazione;
la verifica complessiva resta subordinata alle successive consegne V2/V3.
Integrazione e pubblicazione sono registrate in `deploy.md`.
