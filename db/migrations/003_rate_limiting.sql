-- =============================================================================
-- 003 - RATE LIMITING E AUDIT DELLE RICHIESTE DI RECUPERO
-- =============================================================================
-- DB        : admin_entedb (MariaDB 10.11, InnoDB, utf8mb4_unicode_ci)
-- Rollback  : db/rollback/003_rate_limiting_down.sql
-- Dipende da: 002
-- Idempotente: si
--
-- Requisito 6: 5 richieste/ora per IP e 5 richieste/ora per account.
--
-- PERCHE' UNA TABELLA E NON UN CONTATORE IN MEMORIA
--   L applicazione FastAPI e' pensata per girare in piu worker (uvicorn/gunicorn):
--   un contatore in-process darebbe un limite N volte piu permissivo e si
--   azzererebbe a ogni deploy. La tabella e' la fonte di verita' unica.
--   Se in futuro si introduce Redis, questa tabella resta comunque l audit log.
--
-- PRIVACY
--   L IP e' un dato personale (GDPR): si conserva in forma binaria con una
--   RETENTION ESPLICITA di 90 giorni (vedi evento in fondo). La scelta di
--   salvare l IP in chiaro invece che hashato e' coerente con la tabella
--   utenti_log gia' presente, che fa lo stesso.
--   L identificativo (email) NON viene salvato in chiaro: solo il suo hash,
--   perche' una richiesta di reset e' di per se' un dato che non serve
--   conservare in forma leggibile per contare 5 tentativi.
-- =============================================================================

START TRANSACTION;

CREATE TABLE IF NOT EXISTS `password_reset_richiesta` (
  `prr_id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `prr_created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  `prr_ip`         VARBINARY(16) NOT NULL
      COMMENT 'INET6_ATON(ip). Vale sia IPv4 sia IPv6.',

  -- SHA-256(lower(trim(email)) || pepper). Stesso pepper della 002.
  `prr_identificativo_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,

  -- NULL quando l identificativo non corrisponde a nessun account: serve a non
  -- creare, proprio nel log, l oracolo che l endpoint evita di esporre.
  `prr_utente_id`  INT(11) NULL,

  -- Esito INTERNO. Non viene mai restituito al client: a video il messaggio e'
  -- sempre lo stesso (requisito 2).
  `prr_esito` ENUM(
      'email_inviata',
      'identificativo_sconosciuto',
      'ruolo_non_abilitato',
      'utente_disattivato',
      'email_mancante',
      'identificativo_ambiguo',
      'rate_limited_ip',
      'rate_limited_account',
      'errore_invio'
  ) NOT NULL,

  `prr_user_agent` VARCHAR(255) NULL,

  PRIMARY KEY (`prr_id`),

  -- Conteggio per IP nell ultima ora.
  KEY `ix_prr_ip_finestra` (`prr_ip`, `prr_created_at`),

  -- Conteggio per account nell ultima ora.
  KEY `ix_prr_ident_finestra` (`prr_identificativo_hash`, `prr_created_at`),

  -- Retention / pulizia.
  KEY `ix_prr_created_at` (`prr_created_at`),

  KEY `ix_prr_utente_id` (`prr_utente_id`),
  CONSTRAINT `fk_prr_utente`
    FOREIGN KEY (`prr_utente_id`) REFERENCES `utenti` (`utente_id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Audit e rate limiting delle richieste di recupero password. Retention 90 giorni.';

COMMIT;

-- -----------------------------------------------------------------------------
-- QUERY DI RIFERIMENTO
-- -----------------------------------------------------------------------------
-- Controllo PRIMA di elaborare la richiesta (entrambi i limiti insieme):
--
-- SELECT
--   SUM(prr_ip = INET6_ATON(:ip))                              AS per_ip,
--   SUM(prr_identificativo_hash = :ident_hash)                 AS per_account
-- FROM password_reset_richiesta
-- WHERE prr_created_at >= NOW() - INTERVAL 1 HOUR
--   AND (prr_ip = INET6_ATON(:ip) OR prr_identificativo_hash = :ident_hash);
--
-- Se per_ip >= 5 -> esito 'rate_limited_ip'
-- Se per_account >= 5 -> esito 'rate_limited_account'
-- In ENTRAMBI i casi: si registra comunque la riga, NON si invia nulla, e a
-- video compare lo STESSO messaggio generico con lo STESSO codice HTTP 200.
-- Un 429 esplicito direbbe all attaccante "questo indirizzo esiste ed e'
-- appetibile"; il rate limit deve restare invisibile.

-- -----------------------------------------------------------------------------
-- RETENTION (opzionale ma consigliata). Richiede event_scheduler = ON.
-- Verifica:  SHOW VARIABLES LIKE 'event_scheduler';
-- Attiva:    SET GLOBAL event_scheduler = ON;   -- e event_scheduler=ON in my.cnf
-- -----------------------------------------------------------------------------
DROP EVENT IF EXISTS `ev_purge_password_reset_richiesta`;
CREATE EVENT IF NOT EXISTS `ev_purge_password_reset_richiesta`
  ON SCHEDULE EVERY 1 DAY
  STARTS (CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 3 HOUR)
  COMMENT 'GDPR: cancella le richieste di reset piu vecchie di 90 giorni.'
  DO
    DELETE FROM `password_reset_richiesta`
     WHERE `prr_created_at` < NOW() - INTERVAL 90 DAY;

DROP EVENT IF EXISTS `ev_purge_password_reset_token`;
CREATE EVENT IF NOT EXISTS `ev_purge_password_reset_token`
  ON SCHEDULE EVERY 1 DAY
  STARTS (CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 3 HOUR + INTERVAL 10 MINUTE)
  COMMENT 'Cancella i token di reset scaduti da oltre 30 giorni.'
  DO
    DELETE FROM `password_reset_token`
     WHERE `prt_expires_at` < NOW() - INTERVAL 30 DAY;
