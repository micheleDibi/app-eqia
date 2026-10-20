# Equia

Base autonoma del gestionale Equia, derivata da Università ERSAF.
Comprende la struttura comune, il catalogo dei quattro ruoli, il database
locale nuovo e i moduli di accesso, profilo, sicurezza ed EduNews riutilizzati.
Dashboard vuota; attuatori, sottoscrittori, centri e Notizie da completare.

- [Avvio locale e verifiche](docs/development.md)
- [Perimetro e architettura](docs/project_brief.md)
- [Divisione del lavoro e confini dei moduli](docs/collaborazione.md)
- [Contratto tra anagrafica e account](docs/contratti-account.md)
- [Decisioni della base](docs/adr/0001-base-e-confini.md)

Ogni sviluppatore lavora sul proprio clone e database. Leggere la divisione
del lavoro prima di iniziare una tranche; modelli, ruoli, navigazione e tema
restano comuni. La creazione account rimane interna al gestionale.

Staging previsto su `eqiastaging.ersaf.it`; la presenza del dominio nella
configurazione non attesta un deploy.
