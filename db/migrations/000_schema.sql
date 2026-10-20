-- Schema iniziale Equia: esclusivamente struttura.
CREATE TABLE `ruoli` (
  `ruolo_id` int(11) NOT NULL AUTO_INCREMENT,
  `ruolo_codice` varchar(45) NOT NULL DEFAULT '',
  `ruolo_descrizione` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`ruolo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `aziende` (
  `azienda_id` int(11) NOT NULL AUTO_INCREMENT,
  `azienda_ragione_sociale` varchar(255) NOT NULL,
  `azienda_partitaIVA` varchar(255) NOT NULL,
  `azienda_codiceFiscale` varchar(255) DEFAULT NULL,
  `azienda_fatturazioneSDI` varchar(255) DEFAULT NULL,
  `azienda_via` varchar(255) NOT NULL,
  `azienda_civico` varchar(255) DEFAULT NULL,
  `azienda_citta` varchar(255) NOT NULL,
  `azienda_CAP` varchar(45) NOT NULL,
  `azienda_provincia` varchar(45) NOT NULL,
  `azienda_sitoWeb` varchar(255) DEFAULT NULL,
  `azienda_email` varchar(255) DEFAULT NULL,
  `azienda_telefono` varchar(45) DEFAULT NULL,
  `azienda_pec` varchar(255) DEFAULT NULL,
  `azienda_logo` longblob DEFAULT NULL,
  `azienda_codice_nazionale` varchar(45) DEFAULT NULL,
  `azienda_iban` varchar(255) DEFAULT NULL,
  `azienda_codice_bic` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`azienda_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `utenti` (
  `utente_id` int(11) NOT NULL AUTO_INCREMENT,
  `utente_username` varchar(255) NOT NULL,
  `utente_password` varchar(255) NOT NULL,
  `utente_ultimo_login` date DEFAULT NULL,
  `utente_ultimo_logout` date DEFAULT NULL,
  `utente_padre` int(11) DEFAULT NULL,
  `utente_attivoSN` int(11) DEFAULT -1,
  `utente_created_by` int(11) DEFAULT NULL,
  `utente_created_at` date DEFAULT NULL,
  `utente_updated_by` int(11) DEFAULT NULL,
  `utente_updated_at` datetime DEFAULT NULL,
  `utente_salt` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`utente_id`),
  KEY `FK_utenti_utente_created_by` (`utente_created_by`),
  KEY `FK_utenti_utente_updated_by` (`utente_updated_by`),
  CONSTRAINT `FK_utenti_utente_created_by` FOREIGN KEY (`utente_created_by`)
    REFERENCES `utenti` (`utente_id`),
  CONSTRAINT `FK_utenti_utente_updated_by` FOREIGN KEY (`utente_updated_by`)
    REFERENCES `utenti` (`utente_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `clienti` (
  `cliente_id` int(11) NOT NULL AUTO_INCREMENT,
  `cliente_codice` varchar(20) NOT NULL DEFAULT '',
  `cliente_codice_fiscale` varchar(20) DEFAULT NULL,
  `cliente_nome` varchar(255) NOT NULL DEFAULT '',
  `cliente_cognome` varchar(255) NOT NULL DEFAULT '',
  `cliente_email` varchar(255) NOT NULL DEFAULT '',
  `cliente_telefono` varchar(255) NOT NULL DEFAULT '',
  `cliente_pec` varchar(255) DEFAULT NULL,
  `cliente_indirizzo` varchar(255) NOT NULL DEFAULT '',
  `cliente_civico` varchar(45) NOT NULL DEFAULT '',
  `cliente_citta` varchar(255) NOT NULL DEFAULT '',
  `cliente_CAP` varchar(10) NOT NULL DEFAULT '',
  `cliente_provincia` varchar(45) NOT NULL DEFAULT '',
  `cliente_cellulare` varchar(45) DEFAULT NULL,
  `utente_id` int(11) NOT NULL DEFAULT 1,
  `cliente_luogoNascita` varchar(255) NOT NULL DEFAULT '',
  `cliente_provinciaNascita` varchar(45) NOT NULL DEFAULT '',
  `cliente_dataNascita` date NOT NULL DEFAULT '1999-12-31',
  `cliente_cittadinanza` varchar(255) NOT NULL DEFAULT '',
  `cliente_tipoDocumento` varchar(255) NOT NULL DEFAULT '',
  `cliente_documento` varchar(45) NOT NULL DEFAULT '',
  `cliente_comuneRilascio` varchar(255) NOT NULL DEFAULT '',
  `cliente_dataRilascio` date NOT NULL DEFAULT '1999-12-31',
  `cliente_dataScadenzaDocumento` date NOT NULL DEFAULT '1999-12-31',
  `cliente_sesso` varchar(45) NOT NULL DEFAULT '',
  `cliente_indirizzoDomicilio` varchar(255) DEFAULT NULL,
  `cliente_civicoDomicilio` varchar(45) DEFAULT NULL,
  `cliente_cittaDomicilio` varchar(255) DEFAULT NULL,
  `cliente_CAPDomicilio` varchar(45) DEFAULT NULL,
  `cliente_provinciaDomicilio` varchar(45) DEFAULT NULL,
  `cliente_ruolo` int(11) DEFAULT NULL,
  `cliente_gg` int(11) DEFAULT NULL,
  `attuatore_id` int(11) DEFAULT NULL,
  `azienda_id` int(11) DEFAULT NULL,
  `tessera_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`cliente_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `messaggi_email` (
  `messaggio_email_id` int(11) NOT NULL AUTO_INCREMENT,
  `messaggio_email_codice` varchar(45) NOT NULL DEFAULT '',
  `messaggio_email_testo` longtext DEFAULT NULL,
  `messaggio_email_oggetto` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`messaggio_email_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
