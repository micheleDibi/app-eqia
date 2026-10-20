-- Stato autonomo OTP. Il registro legacy logs_otp resta invariato.
CREATE TABLE IF NOT EXISTS otp_sfide (
 impronta CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 cliente_id INT NOT NULL, utente_id INT NOT NULL, autore_id INT NOT NULL,
 tipo VARCHAR(16) NOT NULL, versione CHAR(64) NOT NULL, codice CHAR(64) NOT NULL,
 stato VARCHAR(16) NOT NULL, tentativi INT NOT NULL DEFAULT 0,
 creata DATETIME NOT NULL, scadenza DATETIME NOT NULL,
 INDEX otp_cliente_tipo (cliente_id,tipo), INDEX otp_scadenza (scadenza)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS otp_contatti (
 cliente_id INT NOT NULL, tipo VARCHAR(16) NOT NULL, versione CHAR(64) NOT NULL,
 verificato DATETIME NOT NULL, PRIMARY KEY (cliente_id,tipo)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS otp_attivazioni (
 utente_id INT NOT NULL PRIMARY KEY, cliente_id INT NOT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS otp_limiti (
 chiave CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 finestra DATETIME NOT NULL, ultimo DATETIME NOT NULL, invii INT NOT NULL
) ENGINE=InnoDB;
CREATE EVENT IF NOT EXISTS ev_pulizia_otp ON SCHEDULE EVERY 1 HOUR DO
 DELETE FROM otp_sfide WHERE scadenza < NOW() - INTERVAL 1 DAY;
CREATE EVENT IF NOT EXISTS ev_pulizia_limiti_otp ON SCHEDULE EVERY 1 HOUR DO
 DELETE FROM otp_limiti WHERE finestra < NOW() - INTERVAL 1 DAY;
