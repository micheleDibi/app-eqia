-- =============================================================================
-- 004 - SESSIONI APPLICATIVE (prerequisito del requisito 14)
-- =============================================================================
-- DB        : admin_entedb (MariaDB 10.11, InnoDB, utf8mb4_unicode_ci)
-- Rollback  : db/rollback/004_sessioni_down.sql
-- Dipende da: 001
-- Idempotente: si
--
-- PERCHE' SERVE
--   Oggi l autenticazione e' l header `x-utente-id` (backend/src/auth/routers.py,
--   get_current_utente): un intero non firmato che chiunque puo' cambiare per
--   impersonare qualsiasi utente. Non esistono sessioni, quindi il requisito 14
--   ("invalidare tutte le sessioni attive dopo il cambio password") non e'
--   implementabile finche' non c'e' qualcosa da invalidare.
--
-- PERCHE' UNA TABELLA NUOVA E NON `utente_session`
--   `utente_session` esiste gia' nel dump ma appartiene alla piattaforma legacy
--   Instant Developer (aderenti.ersaf.it) e ha un session_id VARCHAR(45) in
--   chiaro. Riutilizzarla significherebbe (a) scrivere in una tabella che un
--   altro applicativo in produzione sta ancora leggendo e (b) ereditarne il
--   formato. La 000 (punto 14) verifica se e' ancora viva.
--
-- MODELLO
--   Token opaco (secrets.token_urlsafe(32)) consegnato al client; nel DB solo
--   SHA-256(token || SESSION_TOKEN_PEPPER). Nessun JWT: un JWT non e'
--   revocabile senza una blacklist, e la revoca e' esattamente il requisito 14.
-- =============================================================================

START TRANSACTION;

CREATE TABLE IF NOT EXISTS `auth_sessione` (
  `sess_id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `utente_id`       INT(11) NOT NULL,

  `sess_token_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,

  `sess_created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sess_last_seen_at` DATETIME NULL,
  `sess_expires_at`   DATETIME NOT NULL
      COMMENT 'created_at + SESSION_TTL_HOURS (default 12).',

  `sess_revoked_at`     DATETIME NULL,
  `sess_revoked_reason` ENUM('logout','password_reset','password_cambiata',
                             'admin','scadenza','utente_disattivato') NULL,

  `sess_ip`         VARBINARY(16) NULL,
  `sess_user_agent` VARCHAR(255)  NULL,

  PRIMARY KEY (`sess_id`),
  UNIQUE KEY `uq_sess_token_hash` (`sess_token_hash`),

  -- Revoca massiva per utente (requisito 14).
  KEY `ix_sess_utente_attive` (`utente_id`, `sess_revoked_at`, `sess_expires_at`),
  KEY `ix_sess_expires_at` (`sess_expires_at`),

  CONSTRAINT `fk_sess_utente`
    FOREIGN KEY (`utente_id`) REFERENCES `utenti` (`utente_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Sessioni applicative revocabili. Sostituisce l header x-utente-id.';

COMMIT;

-- -----------------------------------------------------------------------------
-- QUERY DI RIFERIMENTO
-- -----------------------------------------------------------------------------
-- [A] Requisito 14 - revoca di TUTTE le sessioni dopo il cambio password.
--     Va eseguita nella stessa transazione dello UPDATE della password.
-- UPDATE auth_sessione
--    SET sess_revoked_at = NOW(), sess_revoked_reason = 'password_reset'
--  WHERE utente_id = :utente_id
--    AND sess_revoked_at IS NULL;
--
-- [B] Difesa in profondita': anche se la [A] fallisse, la validazione della
--     sessione deve scartare le sessioni nate PRIMA dell ultimo cambio password.
-- SELECT s.utente_id
--   FROM auth_sessione s
--   JOIN utenti u ON u.utente_id = s.utente_id
--  WHERE s.sess_token_hash = :token_hash
--    AND s.sess_revoked_at IS NULL
--    AND s.sess_expires_at > NOW()
--    AND u.`utente_attivoSN` = -1                     -- -1 = attivo
--    AND (u.utente_password_changed_at IS NULL
--         OR s.sess_created_at >= u.utente_password_changed_at);
--
-- [C] Pulizia periodica.
-- DELETE FROM auth_sessione WHERE sess_expires_at < NOW() - INTERVAL 7 DAY LIMIT 5000;

DROP EVENT IF EXISTS `ev_purge_auth_sessione`;
CREATE EVENT IF NOT EXISTS `ev_purge_auth_sessione`
  ON SCHEDULE EVERY 1 DAY
  STARTS (CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 3 HOUR + INTERVAL 20 MINUTE)
  COMMENT 'Cancella le sessioni scadute da oltre 7 giorni.'
  DO
    DELETE FROM `auth_sessione`
     WHERE `sess_expires_at` < NOW() - INTERVAL 7 DAY;
