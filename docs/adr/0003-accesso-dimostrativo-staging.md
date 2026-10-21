# 0003 — Precompilazione temporanea del codice di accesso

Stato: approvato, 21 ottobre 2026.

Il collaudo pubblico deve essere consultabile prima della configurazione SMTP.
Il login mantiene password e conferma del codice; nel solo staging il codice
email viene temporaneamente restituito al browser e precompilato. In questa
modalità il codice non costituisce un secondo fattore indipendente.

La policy unica è `backend/src/otp/precompilazione.py`. Richiede tutte le
condizioni: marker `EQIA_AMBIENTE=staging`, destinazione del database, origine
HTTPS e TLS conformi a `deploy/staging.json`, ambiente diverso da produzione,
`EMAIL_BACKEND=file` e host, utente e password SMTP vuoti. Se manca una
condizione la risposta non contiene il codice. La configurazione è letta
all'avvio: dopo aver configurato SMTP riavviare l'API tramite il deploy.

Il campo opzionale `codice_precompilato` compare esclusivamente nelle sfide
`login` ed `email_accesso`, dopo password valida e salvataggio dell'email
su file, anche al reinvio o alla scelta del metodo email. Nessun endpoint
consente di recuperare il codice da una sfida esistente. Risposte `no-store`,
hash nel database, scadenza, limiti e consumo atomico restano quelli comuni.

Il frontend usa `useOtp` e il parser comune `codicePrecompilato`: conserva
il valore soltanto nello stato del modulo, aggiorna il codice al reinvio e
svuota il campo quando il server non fornisce più la precompilazione. La
conferma rimane un'azione esplicita. I codici di verifica contatti, recupero
password, authenticator e passkey sono esclusi.

Il passaggio a SMTP non richiede un nuovo rilascio frontend. Le verifiche
locali simulano la configurazione remota soltanto nella policy, usando
sempre il database usa-e-getta e messaggi su file o in memoria.
