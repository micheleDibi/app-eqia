# 0001 — Base autonoma e responsabilità

Stato: base di sviluppo, 20 ottobre 2026.

Equia riusa i flussi di accesso e le primitive UI di Università, ma ha repository,
database, segreti, cookie e destinazione di collaudo propri.
Il database parte da DDL e cataloghi; nessun dump o dato applicativo di origine.

I soli ruoli di accesso sono Nazionale, Business, Startup e Startup for Education.
Business accorpa Regionale e Provinciale; i due tipi Startup corrispondono ad Aderente.
Le assegnazioni ammesse stanno in `shared/ruoli.json`, consumato da entrambi i livelli.
Una persona senza accesso mantiene un ruolo nullo: non è un nuovo ruolo autenticabile.

La prima base contiene accesso, sicurezza, profilo ed EduNews riusati, con verifiche
di avvio. Le sezioni anagrafiche e Notizie sono punti di composizione, senza CRUD
o contenuti fittizi presentati come dati reali. La dashboard resta vuota.

Lo sviluppo successivo segue `docs/collaborazione.md`. La base non attesta il
completamento dei pacchetti M1–M3 e V1–V3. Nuove funzioni nei pacchetti di Vincenzo
restano al loro responsabile.

Il collaudo previsto è `https://eqiastaging.ersaf.it`. Il dominio comunicato
non attesta un deploy; server, segreti, database e provider vanno predisposti
e verificati nella relativa attività di rilascio.
