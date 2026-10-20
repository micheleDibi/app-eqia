# Confine account e anagrafica

## Dati comuni già presenti

- `utenti.utente_id` identifica l'account; `clienti.cliente_id` identifica la persona.
  Gli ID non devono coincidere e non sono intercambiabili.
- `clienti.utente_id` collega i due. Il ruolo di accesso è `cliente_ruolo`,
  riferito ai quattro ID di `shared/ruoli.json`.
- Una persona senza accesso può avere ruolo nullo. Il sottoscrittore non
  diventa automaticamente Startup e non aggiunge un quinto ruolo al catalogo.
- La gerarchia utenti è `utente_padre`; il centro è `clienti.azienda_id`.
- Stato account: `0` in attesa/disattivato, `-1` attivo. Password solo tramite
  i servizi di hashing; nessuna password generata nelle pagine anagrafiche.
- Sessione browser: cookie HttpOnly `eqia_sessione` in locale e
  `__Host-eqia_sessione` su HTTPS; header `X-EQIA-Request` e `X-CSRF-Token`.
  Identità e CSRF restano in memoria; nessun token nel localStorage.

## Integrazione da realizzare

Matteo salva i dati della persona e del centro, applica la policy dei ruoli e
la visibilità. Vincenzo implementa il servizio di creazione/attivazione account
in `backend/src/account/`, riutilizzando le verifiche contatti esistenti.

La creazione di persona e account usa la stessa sessione SQLAlchemy e una sola
transazione del caso d'uso chiamante. Il servizio account restituisce l'ID utente;
il chiamante salva il collegamento e l'eventuale attivazione pendente prima del
commit. L'invio di messaggi avviene soltanto dopo il commit. Il servizio non
assegna autonomamente un ruolo e non decide la rete visibile.

Nel frontend, la futura sezione account riceve `clienteId`, `utenteId` e i
permessi calcolati dal contratto comune. Gestisce contatti e stato account;
la scheda anagrafica non replica OTP, consegna credenziali o recupero.
Concordare la firma del servizio e le props nella prima PR di V1, prima che M1
colleghi la creazione definitiva: i due pacchetti possono proseguire sulle parti indipendenti.

## Firma del servizio (V1)

```python
from src.account.creazione import crea_account

utente_id = crea_account(db, nome=..., cognome=..., autore_id=...)
```

- Crea solo la riga `utenti`: disattivata (`0`), con una password provvisoria
  casuale che non viene comunicata a nessuno; quella vera viene generata
  all'attivazione e inviata via email.
- Nome utente: nome e cognome con la sola iniziale
  maiuscola, uniti (`MarioRossi`), senza spazi né apostrofi (`Anna Maria De
  Luca` → `AnnamariaDeluca`, `D'Amico` → `Damico`); se già usato, numero in
  coda da 2. Il controllo dei doppioni segue la regola del
  login: maiuscole, minuscole e accenti non contano.
- `utente_padre`, `utente_created_by` e `utente_updated_by` valgono `autore_id`.
  Il padre entra nella regola di visibilità: da confermare con M1.
- Non assegna ruoli, non crea l'anagrafica né l'attesa di attivazione, non fa
  commit. `ValueError` se nome e cognome sono vuoti.

Il chiamante, nella stessa transazione: salva l'anagrafica con `utente_id` e
ruolo, aggiunge `Attivazione(utente_id, cliente_id)`, poi fa commit.

Limite noto: `utente_username` non ha un vincolo UNIQUE; due creazioni nello
stesso istante con lo stesso nominativo potrebbero ricevere lo stesso nome.

## Sezione account nel frontend (V1)

```jsx
import SezioneAccount from "../account/SezioneAccount.jsx";

<SezioneAccount clienteId={id} valori={{ email, cellulare }} permessi={{ statoAccount: nazionale }} />
```

- Si monta su un'anagrafica già salvata. Mostra stato dell'account, email e
  cellulare con "Verifica" o "Verificata"; la verifica apre la finestra del
  codice. I valori dei contatti si modificano nella scheda, non qui.
- `valori` (facoltativo): i contatti come sono a video; se diversi da quelli
  salvati compare "Salva le modifiche per verificare questo contatto.".
- `permessi.statoAccount`: mostra Attiva/Disattiva. Lo stato lo cambia solo
  il Nazionale (`PUT /clienti/{id}/account/stato`, 403
  per gli altri): il cambio chiude l'attesa di attivazione e l'attivazione a
  mano non spedisce credenziali.

## Criteri di integrazione

- Fallimento creazione: nessuna anagrafica/account orfano.
- Nessuna assegnazione di ruolo superiore dal payload.
- Business opera soltanto nella propria rete; Startup non amministra account altrui.
- Attivazione come Università: verifica email e cellulare prima della password iniziale.
- Nazionale non ottiene una sessione prima del secondo fattore.
- Migrazioni e modifiche ai modelli comuni passano da una PR di contratto separata.
- Test automatici su MariaDB usa-e-getta e prova browser per ogni flusso consegnato.
