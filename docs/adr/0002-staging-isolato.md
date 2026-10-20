# 0002 — Staging isolato e rilascio ripetibile

Stato: approvato nel mandato di staging del 20 ottobre 2026.

Equia condivide la macchina applicativa con Università, ma mantiene progetto
Compose, reti, directory, database, segreti, CA database e cookie indipendenti.
Il contratto di destinazione è unico in `deploy/staging.json`.
I Dockerfile usano la radice del repository per includere gli stessi cataloghi
`shared` nel frontend e nel backend.

Il deploy parte da un commit Git, verifica l'archivio trasferito e conserva
release e backup. L'inizializzazione applica DDL al database vuoto:
non importa dati del gestionale di origine. Il motore delle migrazioni è
condiviso con lo sviluppo; gli ingressi locale/staging hanno guardie distinte.

TLS è verificato anche nel collaudo con provider su file. La modalità iniziale
non effettua invii reali e non abilita uscite API verso servizi esterni.
L'attivazione dei provider resta un intervento successivo con configurazione,
connettività e prove proprie.

Il rollback applicativo conserva lo schema corrente; le migrazioni richiedono
compatibilità esplicita e un backup. Il DDL non è considerato atomico.
I comandi di rilascio e le procedure di verifica sono in `docs/deploy.md`.
