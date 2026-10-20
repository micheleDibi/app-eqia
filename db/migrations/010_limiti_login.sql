-- Contatori condivisi tra processi, indipendenti dall'esistenza dell'account.
-- Nessuna modifica a utenti, password o sessioni legacy.
CREATE TABLE IF NOT EXISTS auth_login_limite (
    chiave CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    tentativi INT UNSIGNED NOT NULL DEFAULT 0,
    finestra_inizio DATETIME(6) NOT NULL,
    prossimo_tentativo DATETIME(6) NULL,
    aggiornato_il DATETIME(6) NOT NULL,
    INDEX ix_auth_login_pulizia (aggiornato_il)
) ENGINE=InnoDB;

CREATE EVENT IF NOT EXISTS ev_auth_login_pulizia
    ON SCHEDULE EVERY 1 HOUR
    DO DELETE FROM auth_login_limite
       WHERE aggiornato_il < NOW() - INTERVAL 1 DAY;
