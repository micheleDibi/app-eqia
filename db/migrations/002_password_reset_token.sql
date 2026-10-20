-- =============================================================================
-- 002 - TOKEN DI RECUPERO PASSWORD
-- =============================================================================
-- DB        : admin_entedb (MariaDB 10.11, InnoDB, utf8mb4_unicode_ci)
-- Rollback  : db/rollback/002_password_reset_token_down.sql
-- Dipende da: 001
-- Idempotente: si
--
-- MODELLO DI SICUREZZA
--   - Il token in chiaro esiste SOLO dentro il link email. Nel DB si salva
--     esclusivamente SHA-256(token || pepper) in esadecimale (64 char).
--   - SHA-256 e non bcrypt: il token e' gia 256 bit di entropia da CSPRNG,
--     quindi non e' attaccabile a dizionario e un hash veloce permette la
--     UNIQUE + lookup diretta O(1) senza timing attack sul confronto.
--   - Il pepper (PASSWORD_RESET_TOKEN_PEPPER) sta in .env, NON nel DB: chi
--     legge un backup del database non puo' derivare i token.
--   - Monouso e atomico: il consumo passa da una UPDATE condizionale che deve
--     restituire ROW_COUNT() = 1 (vedi in fondo).
-- =============================================================================

START TRANSACTION;

CREATE TABLE IF NOT EXISTS `password_reset_token` (
  `prt_id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `utente_id`         INT(11)         NOT NULL,

  -- SHA-256(token_urlsafe || pepper) in hex minuscolo. Mai il token in chiaro.
  `prt_token_hash`    CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,

  `prt_created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `prt_expires_at`    DATETIME NOT NULL
      COMMENT 'created_at + PASSWORD_RESET_TOKEN_TTL_MINUTES (default 60).',

  -- Stato: i tre campi sono mutuamente esclusivi e tutti NULL = token valido.
  `prt_consumed_at`   DATETIME NULL COMMENT 'Valorizzato dal cambio password riuscito.',
  `prt_revoked_at`    DATETIME NULL COMMENT 'Valorizzato da una nuova richiesta o dal cambio password.',
  `prt_revoked_reason` VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NULL
      COMMENT 'nuova_richiesta | password_cambiata | admin | pulizia',

  -- Contesto della RICHIESTA (non del consumo): utile in caso di abuso.
  `prt_request_ip`    VARBINARY(16) NULL COMMENT 'INET6_ATON dell IP richiedente.',
  `prt_request_ua`    VARCHAR(255)  NULL COMMENT 'User-Agent troncato a 255.',

  -- Contesto del CONSUMO: permette di rispondere a "da dove e' stata cambiata?".
  `prt_consumed_ip`   VARBINARY(16) NULL,
  `prt_consumed_ua`   VARCHAR(255)  NULL,

  -- Email a cui il link e' stato realmente spedito, congelata al momento
  -- dell invio: se il cliente cambia indirizzo dopo, l audit resta leggibile.
  `prt_email_inviata` VARCHAR(255) NULL,

  PRIMARY KEY (`prt_id`),

  -- Rende impossibile un collision/replay e rende la lookup una sola riga.
  UNIQUE KEY `uq_prt_token_hash` (`prt_token_hash`),

  -- Revoca massiva dei token precedenti di un utente (requisito 5).
  KEY `ix_prt_utente_attivi` (`utente_id`, `prt_consumed_at`, `prt_revoked_at`, `prt_expires_at`),

  -- Job di pulizia periodica.
  KEY `ix_prt_expires_at` (`prt_expires_at`),

  CONSTRAINT `fk_prt_utente`
    FOREIGN KEY (`utente_id`) REFERENCES `utenti` (`utente_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Token monouso per il recupero password. Solo hash, mai il token in chiaro.';

COMMIT;

-- -----------------------------------------------------------------------------
-- QUERY DI RIFERIMENTO PER L'APPLICAZIONE
-- (riportate qui perche' la correttezza del flusso dipende dalla loro forma)
-- -----------------------------------------------------------------------------

-- [A] Requisito 5 - revoca dei token precedenti, PRIMA di inserire il nuovo.
--     Da eseguire nella STESSA transazione dell INSERT.
-- UPDATE password_reset_token
--    SET prt_revoked_at = NOW(), prt_revoked_reason = 'nuova_richiesta'
--  WHERE utente_id = :utente_id
--    AND prt_consumed_at IS NULL
--    AND prt_revoked_at  IS NULL;

-- [B] Requisito 9 - validazione del token all apertura della pagina.
--     Sola lettura: NON marca nulla, altrimenti un crawler che apre il link
--     (o il prefetch del client di posta) brucerebbe il token.
-- SELECT prt_id, utente_id
--   FROM password_reset_token
--  WHERE prt_token_hash = :token_hash
--    AND prt_consumed_at IS NULL
--    AND prt_revoked_at  IS NULL
--    AND prt_expires_at  > NOW();

-- [C] Requisito 13 - consumo ATOMICO. L applicazione deve verificare
--     ROW_COUNT() = 1: se e' 0 il token era gia' usato/scaduto/revocato e la
--     password NON va cambiata. Due richieste concorrenti: solo una vince.
-- UPDATE password_reset_token
--    SET prt_consumed_at = NOW(), prt_consumed_ip = :ip, prt_consumed_ua = :ua
--  WHERE prt_token_hash  = :token_hash
--    AND prt_consumed_at IS NULL
--    AND prt_revoked_at  IS NULL
--    AND prt_expires_at  > NOW();

-- [D] Dopo il cambio riuscito: revoca ogni altro token dello stesso utente.
-- UPDATE password_reset_token
--    SET prt_revoked_at = NOW(), prt_revoked_reason = 'password_cambiata'
--  WHERE utente_id = :utente_id
--    AND prt_id <> :prt_id_consumato
--    AND prt_consumed_at IS NULL
--    AND prt_revoked_at  IS NULL;

-- [E] Pulizia periodica (cron giornaliero). Si tengono 30 giorni per audit.
-- DELETE FROM password_reset_token
--  WHERE prt_expires_at < NOW() - INTERVAL 30 DAY
--  LIMIT 5000;
