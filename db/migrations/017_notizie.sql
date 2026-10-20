-- =============================================================================
-- 017 - Notizie del Nazionale: notizie, sezioni e argomenti, destinatari,
--       allegati, gruppi scelti e letture.
-- =============================================================================
-- DB        : eqia (MariaDB 10.11, InnoDB, utf8mb4_unicode_ci)
-- Dipende da: 000 (utenti, ruoli)
-- Idempotente: si (CREATE TABLE IF NOT EXISTS)
--
-- PROBLEMA
--   La sezione Notizie (backend/src/notizie/) non ha tabelle: il database
--   parte vuoto e senza importazioni.
--
-- COSA FA
--   Crea le tabelle delle notizie:
--   - tag e tag_dettaglio: le sezioni e i loro argomenti. Si aggiungono, si
--     disattivano e si riattivano; non si rinominano e non si cancellano;
--   - notizia: titolo, testi, link, immagine e sezione (tag_id);
--   - notizia_tag_dettaglio: gli argomenti di una notizia, tutti della sua
--     sezione;
--   - notizia_gruppo: i gruppi di destinatari scelti (un ruolo per riga);
--   - notizia_partecipante: i destinatari, una riga per utente, ricalcolati
--     a ogni salvataggio dagli utenti attivi dei gruppi scelti;
--   - notizia_allegato: i nomi dei file allegati (i file stanno nell'archivio,
--     backend/src/notizie/archivio.py);
--   - notizia_letta: chi ha aperto quale notizia, una riga per notizia e utente.
--
--   Le righe collegate si cancellano con la notizia (ON DELETE CASCADE); il
--   backend le cancella comunque in modo esplicito (notizie/dati.py, elimina).
-- =============================================================================

CREATE TABLE IF NOT EXISTS `tag` (
  `tag_id` int(11) NOT NULL AUTO_INCREMENT,
  `tag_descrizione` varchar(255) NOT NULL,
  `tag_attivoSN` int(11) NOT NULL DEFAULT -1,
  PRIMARY KEY (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tag_dettaglio` (
  `tag_dettaglio_id` int(11) NOT NULL AUTO_INCREMENT,
  `tag_id` int(11) NOT NULL,
  `tag_dettaglio_descrizione` varchar(255) NOT NULL,
  `tag_dettaglio_attivoSN` int(11) NOT NULL DEFAULT -1,
  PRIMARY KEY (`tag_dettaglio_id`),
  KEY `ix_tag_dettaglio_tag` (`tag_id`),
  CONSTRAINT `fk_tag_dettaglio_tag` FOREIGN KEY (`tag_id`) REFERENCES `tag` (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notizia` (
  `notizia_id` int(11) NOT NULL AUTO_INCREMENT,
  `notizia_titolo` varchar(255) NOT NULL,
  `notizia_sottotitolo` text NOT NULL,
  `notizia_riassunto` text NOT NULL,
  `notizia_descrizione` mediumtext NOT NULL,
  `notizia_url` text NOT NULL,
  `notizia_immagine_filename` varchar(64) DEFAULT NULL,
  `tag_id` int(11) NOT NULL,
  `notizia_created_by` int(11) NOT NULL,
  `notizia_created_at` datetime NOT NULL,
  `notizia_updated_by` int(11) NOT NULL,
  `notizia_updated_at` datetime NOT NULL,
  PRIMARY KEY (`notizia_id`),
  KEY `ix_notizia_tag` (`tag_id`),
  KEY `ix_notizia_creata` (`notizia_created_at`, `notizia_id`),
  CONSTRAINT `fk_notizia_tag` FOREIGN KEY (`tag_id`) REFERENCES `tag` (`tag_id`),
  CONSTRAINT `fk_notizia_created_by` FOREIGN KEY (`notizia_created_by`) REFERENCES `utenti` (`utente_id`),
  CONSTRAINT `fk_notizia_updated_by` FOREIGN KEY (`notizia_updated_by`) REFERENCES `utenti` (`utente_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notizia_tag_dettaglio` (
  `notizia_tag_dettaglio_id` int(11) NOT NULL AUTO_INCREMENT,
  `notizia_id` int(11) NOT NULL,
  `tag_dettaglio_id` int(11) NOT NULL,
  PRIMARY KEY (`notizia_tag_dettaglio_id`),
  UNIQUE KEY `uq_notizia_tag_dettaglio` (`notizia_id`, `tag_dettaglio_id`),
  KEY `ix_notizia_tag_dettaglio_argomento` (`tag_dettaglio_id`),
  CONSTRAINT `fk_notizia_tag_dettaglio_notizia` FOREIGN KEY (`notizia_id`)
    REFERENCES `notizia` (`notizia_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notizia_tag_dettaglio_argomento` FOREIGN KEY (`tag_dettaglio_id`)
    REFERENCES `tag_dettaglio` (`tag_dettaglio_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notizia_gruppo` (
  `notizia_gruppo_id` int(11) NOT NULL AUTO_INCREMENT,
  `notizia_id` int(11) NOT NULL,
  `ruolo_id` int(11) NOT NULL,
  PRIMARY KEY (`notizia_gruppo_id`),
  UNIQUE KEY `uq_notizia_gruppo_notizia_ruolo` (`notizia_id`, `ruolo_id`),
  KEY `ix_notizia_gruppo_ruolo` (`ruolo_id`),
  CONSTRAINT `fk_notizia_gruppo_notizia` FOREIGN KEY (`notizia_id`)
    REFERENCES `notizia` (`notizia_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notizia_gruppo_ruolo` FOREIGN KEY (`ruolo_id`) REFERENCES `ruoli` (`ruolo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notizia_partecipante` (
  `notizia_partecipante_id` int(11) NOT NULL AUTO_INCREMENT,
  `notizia_id` int(11) NOT NULL,
  `partecipante_id` int(11) NOT NULL,
  `notizia_partecipante_created_at` datetime NOT NULL,
  PRIMARY KEY (`notizia_partecipante_id`),
  UNIQUE KEY `uq_notizia_partecipante` (`notizia_id`, `partecipante_id`),
  KEY `ix_notizia_partecipante_utente` (`partecipante_id`),
  CONSTRAINT `fk_notizia_partecipante_notizia` FOREIGN KEY (`notizia_id`)
    REFERENCES `notizia` (`notizia_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notizia_partecipante_utente` FOREIGN KEY (`partecipante_id`)
    REFERENCES `utenti` (`utente_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notizia_allegato` (
  `notizia_allegato_id` int(11) NOT NULL AUTO_INCREMENT,
  `notizia_id` int(11) NOT NULL,
  `notizia_allegato_nome_file` varchar(255) NOT NULL,
  `notizia_allegato_created_by` int(11) NOT NULL,
  `notizia_allegato_created_at` datetime NOT NULL,
  PRIMARY KEY (`notizia_allegato_id`),
  KEY `ix_notizia_allegato_notizia` (`notizia_id`),
  CONSTRAINT `fk_notizia_allegato_notizia` FOREIGN KEY (`notizia_id`)
    REFERENCES `notizia` (`notizia_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notizia_allegato_created_by` FOREIGN KEY (`notizia_allegato_created_by`)
    REFERENCES `utenti` (`utente_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notizia_letta` (
  `notizia_letta_id` int(11) NOT NULL AUTO_INCREMENT,
  `notizia_id` int(11) NOT NULL,
  `utente_id` int(11) NOT NULL,
  `notizia_letta_datetime` datetime NOT NULL,
  PRIMARY KEY (`notizia_letta_id`),
  UNIQUE KEY `uq_notizia_letta_notizia_utente` (`notizia_id`, `utente_id`),
  KEY `ix_notizia_letta_utente` (`utente_id`),
  CONSTRAINT `fk_notizia_letta_notizia` FOREIGN KEY (`notizia_id`)
    REFERENCES `notizia` (`notizia_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notizia_letta_utente` FOREIGN KEY (`utente_id`)
    REFERENCES `utenti` (`utente_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
