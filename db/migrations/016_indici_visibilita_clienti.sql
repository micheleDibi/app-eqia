-- =============================================================================
-- 016 - Indici per la visibilita' dei clienti.
-- =============================================================================
-- DB        : admin_entedb (MariaDB 10.11, InnoDB, utf8mb4_unicode_ci)
-- Rollback  : db/rollback/016_indici_visibilita_clienti_down.sql
-- Dipende da: nessuna
-- Idempotente: si
--
-- PROBLEMA
--   La regola di visibilita' (backend/src/auth/visibilita.py) e' una CTE
--   ricorsiva che scende lungo utenti.utente_padre e parte dagli utenti che
--   hanno una riga clienti nella stessa azienda. Nel database reale:
--     - utenti ha indici solo su PK, utente_created_by e utente_updated_by:
--       nulla su utente_padre, quindi ogni passo della ricorsione e' una
--       scansione completa della tabella;
--     - clienti non ha nulla su azienda_id.
--   Misurato su 5000 utenti sintetici: ~100 ms per utente senza questi
--   indici, ~4 ms con, e tutti i passi diventano ricerche su indice coprente.
--
--   pratiche.azienda_id non serve: ha gia' FK_pratiche_azienda_id.
--
-- PRIMA DI APPLICARE IN PRODUZIONE
--   Controllare che non esistano gia' indici equivalenti con un altro nome
--   (IF NOT EXISTS confronta solo il nome):
--       SHOW INDEX FROM utenti  WHERE Column_name = 'utente_padre';
--       SHOW INDEX FROM clienti WHERE Column_name = 'azienda_id';
-- =============================================================================

START TRANSACTION;

ALTER TABLE `utenti`
  ADD INDEX IF NOT EXISTS `ix_utenti_padre` (`utente_padre`);

-- Composto e nell'ordine (azienda_id, utente_id): la radice "colleghi" cerca
-- per azienda e legge solo utente_id, quindi l'indice copre la query.
ALTER TABLE `clienti`
  ADD INDEX IF NOT EXISTS `ix_clienti_azienda_utente` (`azienda_id`, `utente_id`);

COMMIT;
