-- =============================================================================
-- 001 - HASHING DELLE PASSWORD (bcrypt) - colonne di supporto
-- =============================================================================
-- DB        : admin_entedb (MariaDB 10.11, InnoDB, utf8mb4_unicode_ci)
-- Rollback  : db/rollback/001_password_hashing_down.sql
-- Idempotente: si (ADD COLUMN IF NOT EXISTS - sintassi MariaDB)
--
-- CONTESTO
--   Oggi utenti.utente_password contiene la password IN CHIARO per tutte le
--   ~4771 righe, e utenti.utente_salt e' un UUID mai usato in fase di verifica
--   (vedi backend/src/auth/routers.py: confronto == diretto).
--
-- STRATEGIA SCELTA: rehash pigro (lazy rehash), nessun big-bang.
--   1) Questa migrazione aggiunge le colonne, senza toccare i dati.
--   2) Il login prova prima utente_password_hash; se e' NULL confronta il
--      legacy in chiaro e, se corretto, scrive subito l'hash e azzera il
--      legacy nella stessa transazione.
--   3) Il recupero password scrive direttamente utente_password_hash.
--   4) Nessuna operazione massiva, mai. Le righe di chi non fa login restano
--      intatte e continuano a funzionare come prima. L'avanzamento si segue
--      con db/diagnostica/010_stato_migrazione_password.sql.
--
-- ATTENZIONE bcrypt: tronca silenziosamente l'input oltre i 72 BYTE.
--   L'applicazione DEVE rifiutare (o pre-hashare) password piu lunghe.
--   La diagnostica 000 verifica che nessuna password attuale superi il limite.
-- =============================================================================

START TRANSACTION;

ALTER TABLE `utenti`
  -- bcrypt produce 60 caratteri ($2b$12$ + 53); 255 lascia spazio ad argon2id.
  ADD COLUMN IF NOT EXISTS `utente_password_hash` VARCHAR(255)
      CHARACTER SET ascii COLLATE ascii_bin NULL
      COMMENT 'Hash bcrypt/argon2 della password. NULL = ancora su utente_password (legacy in chiaro).'
      AFTER `utente_password`,

  -- Serve a sapere quando forzare un rehash dopo un aumento del cost factor.
  ADD COLUMN IF NOT EXISTS `utente_password_algo` VARCHAR(20)
      CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'legacy_plaintext'
      COMMENT 'legacy_plaintext | bcrypt | argon2id'
      AFTER `utente_password_hash`,

  -- Timestamp usato per invalidare le sessioni emesse prima del cambio
  -- (vedi migrazione 004: ogni sessione con sess_created_at < questo valore
  -- e' da considerare revocata anche se non ancora marcata).
  ADD COLUMN IF NOT EXISTS `utente_password_changed_at` DATETIME NULL
      COMMENT 'Ultimo cambio password riuscito. Usato come cut-off per le sessioni.'
      AFTER `utente_password_algo`,

  -- Traccia minima: distingue un cambio volontario da un recupero password.
  ADD COLUMN IF NOT EXISTS `utente_password_changed_via` VARCHAR(20)
      CHARACTER SET ascii COLLATE ascii_bin NULL
      COMMENT 'reset_email | profilo | admin | migrazione'
      AFTER `utente_password_changed_at`;

-- Indice parziale non esiste in MariaDB: si indicizza l'algoritmo per poter
-- contare/filtrare velocemente le righe ancora legacy durante la migrazione.
ALTER TABLE `utenti`
  ADD INDEX IF NOT EXISTS `ix_utenti_password_algo` (`utente_password_algo`);

COMMIT;

-- -----------------------------------------------------------------------------
-- VERIFICA (esegui a mano dopo la migrazione)
-- -----------------------------------------------------------------------------
-- Quante righe restano da migrare:
--   SELECT utente_password_algo, COUNT(*) FROM utenti GROUP BY utente_password_algo;
-- Attesa subito dopo questa migrazione: legacy_plaintext = 100%.
--
-- NOTA: utenti.utente_salt (UUID) NON viene usato da bcrypt, che genera e
-- incorpora il proprio salt nell'hash. La colonna resta dov'e' per
-- compatibilita' con la piattaforma Instant Developer: nessuna migrazione la
-- rimuove.
