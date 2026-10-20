-- =============================================================================
-- 005 - INDICI E INTEGRITA' SULLE TABELLE ESISTENTI
-- =============================================================================
-- DB        : admin_entedb (MariaDB 10.11, InnoDB, utf8mb4_unicode_ci)
-- Rollback  : db/rollback/005_indici_e_integrita_down.sql
-- Dipende da: nessuna (indipendente, ma va applicata prima di andare in
--             produzione con il recupero password)
-- Idempotente: si
--
-- PROBLEMA
--   La tabella `clienti` (3906 righe) ha SOLO la PRIMARY KEY: nessun indice su
--   cliente_email, utente_id o cliente_ruolo. La lookup centrale del recupero
--   password
--       SELECT ... FROM clienti WHERE LOWER(TRIM(cliente_email)) = ?
--   sarebbe un full table scan a ogni richiesta, e un full scan e' anche un
--   canale laterale: il tempo di risposta cambia col numero di righe che
--   corrispondono, contraddicendo il requisito di indistinguibilita'.
--
--   Nota: un indice su cliente_email NON viene usato se la query applica
--   LOWER()/TRIM() alla colonna. Con la collation utf8mb4_unicode_ci il
--   confronto e' gia' case-insensitive: l applicazione deve normalizzare
--   il PARAMETRO (lato Python) e confrontare la colonna nuda.
--       OK   : WHERE cliente_email = :email_normalizzata
--       NO   : WHERE LOWER(TRIM(cliente_email)) = :email
-- =============================================================================

START TRANSACTION;

ALTER TABLE `clienti`
  ADD INDEX IF NOT EXISTS `ix_clienti_email`  (`cliente_email`),
  ADD INDEX IF NOT EXISTS `ix_clienti_utente` (`utente_id`),
  ADD INDEX IF NOT EXISTS `ix_clienti_ruolo`  (`cliente_ruolo`),
  -- Indice composto per la query "questa email appartiene a un attuatore attivo?"
  ADD INDEX IF NOT EXISTS `ix_clienti_email_ruolo` (`cliente_email`, `cliente_ruolo`);

COMMIT;

-- =============================================================================
-- SEZIONE FACOLTATIVA - CHIAVI ESTERNE MANCANTI
-- =============================================================================
-- I modelli SQLAlchemy dichiarano ForeignKey su clienti.utente_id,
-- clienti.cliente_ruolo e clienti.azienda_id, ma nel DB reale NON esistono.
-- Aggiungerle e' corretto ma puo' fallire su righe orfane.
--
-- ESEGUI PRIMA QUESTI CONTROLLI: devono restituire 0.
--
--   SELECT COUNT(*) FROM clienti c
--     LEFT JOIN utenti u ON u.utente_id = c.utente_id
--    WHERE u.utente_id IS NULL;
--
--   SELECT COUNT(*) FROM clienti c
--     LEFT JOIN ruoli r ON r.ruolo_id = c.cliente_ruolo
--    WHERE r.ruolo_id IS NULL;
--
--   SELECT COUNT(*) FROM clienti c
--     LEFT JOIN aziende a ON a.azienda_id = c.azienda_id
--    WHERE c.azienda_id IS NOT NULL AND a.azienda_id IS NULL;
--
-- Solo se tutti tornano 0, decommenta:
--
-- ALTER TABLE `clienti`
--   ADD CONSTRAINT `fk_clienti_utente`
--     FOREIGN KEY (`utente_id`) REFERENCES `utenti` (`utente_id`),
--   ADD CONSTRAINT `fk_clienti_ruolo`
--     FOREIGN KEY (`cliente_ruolo`) REFERENCES `ruoli` (`ruolo_id`),
--   ADD CONSTRAINT `fk_clienti_azienda`
--     FOREIGN KEY (`azienda_id`) REFERENCES `aziende` (`azienda_id`);

-- =============================================================================
-- SEZIONE MANUALE - UNIQUE SU utente_username
-- =============================================================================
-- backend/src/utenti/models.py dichiara unique=True su utente_username, ma il
-- DB NON ha il vincolo e contiene 6 username duplicati (incluso il valore '/').
-- Questo significa che oggi .filter(...).first() nel login puo' restituire un
-- utente diverso da quello atteso, in modo non deterministico.
--
-- La UNIQUE NON viene aggiunta automaticamente qui: la bonifica richiede una
-- decisione di business (quale riga sopravvive?). Procedura suggerita:
--
--   1) Elenca i duplicati (query 4 della diagnostica 000).
--   2) Per ciascun gruppo decidi la riga da tenere e rinomina le altre:
--        UPDATE utenti SET utente_username = CONCAT(utente_username, '_dup', utente_id)
--         WHERE utente_id IN (...);
--   3) Bonifica il valore '/' (probabile riga di test).
--   4) Riverifica che la query 4 non restituisca nulla.
--   5) Applica:
--        ALTER TABLE `utenti` ADD UNIQUE KEY `uq_utenti_username` (`utente_username`);
--
-- Finche' il punto 5 non e' fatto, il codice NON deve mai assumere che uno
-- username identifichi un solo utente.
