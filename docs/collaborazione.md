# Responsabilità e punti di integrazione

## Matteo

Base del progetto; database e migrazioni; cataloghi `shared/`; modelli account,
anagrafiche e centri; autorizzazioni e visibilità; navigazione comune; tema,
icone e componenti condivisi; rimozione dei moduli fuori perimetro; integrazione.
Successiva tranche: elenchi e schede attuatori, sottoscrittori e centri.

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
| `frontend/src/components/accesso/`, `profilo/`, futuro `account/`; `Login.jsx`, `PasswordDimenticata.jsx`, `ReimpostaPassword.jsx`, `MioProfilo.jsx` | Vincenzo |
| `frontend/src/components/edunews24/`, `notizie/`; hook, lib e testi/stili specifici di account, profilo, accesso e informazione | Vincenzo |
| `frontend/src/config/routes/`, tema/token, icone, `components/shared/`, shell, `App.jsx`, trasporto HTTP `lib/api.js`, utilità comuni | Matteo |
| `frontend/src/lib/sessione.js`, `logout.js`, `ritornoAccesso.js`, `hooks/useSessione.js`; gli altri file della shell restano comuni | Vincenzo |
| Configurazione della suite e fixture comuni; test dei cataloghi e della base | Matteo |
| Test del singolo modulo | Chi modifica il modulo |

Il modulo Notizie ha già due ingressi collegati: `backend/src/notizie/routers.py`
(prefisso `/notizie`, autenticazione richiesta) e
`frontend/src/components/notizie/PaginaNotizie.jsx` (URL `/notizie`).
Non contiene ancora endpoint applicativi o contenuti: Vincenzo li aggiunge
nel proprio modulo senza cambiare `rotte.py` o `App.jsx`.

Per una variazione a contratti, modello dati o file comuni, aprire prima una
PR piccola di contratto e farla integrare a Matteo; non introdurre copie
alternative delle policy. I router di nuovi moduli passano dallo stesso
responsabile dell'integrazione.

Ogni sviluppatore usa il proprio checkout e un branch per intervento.
Una PR deve contenere un modulo coerente, relativi test e limiti conosciuti.
Matteo integra le PR verificate. Nessun deploy implicito nel merge.

Il primo passo di Vincenzo è leggere `development.md` e avviare il proprio
database locale, poi fissare la firma del servizio V1 nel contratto account.
Può sviluppare V2 e V3 sulle superfici già collegate. Matteo intanto completa
elenchi, schede e centri senza riscrivere i servizi account.

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
