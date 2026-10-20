-- =============================================================================
-- 008 - ESITO 'errore_interno' PER LE RICHIESTE DI RECUPERO
-- =============================================================================
-- DB        : admin_entedb (MariaDB 10.11, InnoDB, utf8mb4_unicode_ci)
-- Rollback  : db/rollback/008_esito_errore_interno_down.sql
-- Dipende da: 003
-- Idempotente: si (MODIFY e' dichiarativa: riapplicarla non cambia nulla)
--
-- PERCHE' SERVE
--   L'endpoint POST /auth/password-reset/request deve rispondere 200 con lo
--   stesso identico corpo qualunque cosa accada: un 500 sarebbe un oracolo.
--   Quindi il codice cattura le eccezioni e risponde comunque — ma senza un
--   valore d'esito corrispondente la riga di audit andrebbe persa proprio nel
--   caso in cui serve di piu', o andrebbe registrata come 'errore_invio',
--   che significa un'altra cosa.
--
-- NON MODIFICA ALCUNA RIGA. Il valore viene aggiunto IN CODA all'ENUM, quindi
-- gli indici numerici dei valori esistenti restano invariati e nessun dato
-- gia' presente cambia significato.
--
-- Nota: le 001-006 non vengono toccate. Il numero 007 non esiste: la
-- numerazione parte da 008 come indicato nella specifica.
-- =============================================================================

ALTER TABLE `password_reset_richiesta`
  MODIFY COLUMN `prr_esito` ENUM(
      'email_inviata',
      'identificativo_sconosciuto',
      'ruolo_non_abilitato',
      'utente_disattivato',
      'email_mancante',
      'identificativo_ambiguo',
      'rate_limited_ip',
      'rate_limited_account',
      'errore_invio',
      'errore_interno'
  ) NOT NULL;

-- -----------------------------------------------------------------------------
-- VERIFICA
--   SELECT COLUMN_TYPE FROM information_schema.COLUMNS
--    WHERE TABLE_SCHEMA = DATABASE()
--      AND TABLE_NAME = 'password_reset_richiesta'
--      AND COLUMN_NAME = 'prr_esito';
--   Deve elencare dieci valori, con 'errore_interno' per ultimo.
