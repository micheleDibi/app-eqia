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

## Criteri di integrazione

- Fallimento creazione: nessuna anagrafica/account orfano.
- Nessuna assegnazione di ruolo superiore dal payload.
- Business opera soltanto nella propria rete; Startup non amministra account altrui.
- Attivazione come Università: verifica email e cellulare prima della password iniziale.
- Nazionale non ottiene una sessione prima del secondo fattore.
- Migrazioni e modifiche ai modelli comuni passano da una PR di contratto separata.
- Test automatici su MariaDB usa-e-getta e prova browser per ogni flusso consegnato.
