-- 015 - Secondo fattore a scelta per il ruolo Nazionale (ADR 0009).
-- Nessuna colonna su utenti. Le sfide restano in otp_sfide, con i tipi
-- login, email_accesso, totp e passkey. Il segreto TOTP e' cifrato dall'API
-- con TOTP_CHIAVE (AES-GCM: nonce, testo cifrato e tag); delle passkey si
-- conserva solo la chiave pubblica; l'handle WebAuthn e' casuale, mai lo username.
CREATE TABLE IF NOT EXISTS auth_totp (
  utente_id INT NOT NULL PRIMARY KEY,
  totp_segreto VARBINARY(96) NOT NULL,
  totp_attivato_il DATETIME NULL,
  totp_ultimo_passo BIGINT NULL,
  totp_creato_il DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  totp_revocato_il DATETIME NULL,
  totp_revocato_motivo VARCHAR(30) NULL,
  CONSTRAINT fk_totp_utente FOREIGN KEY (utente_id) REFERENCES utenti (utente_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_passkey (
  pk_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  utente_id INT NOT NULL,
  pk_credential_id VARBINARY(1024) NOT NULL,
  pk_chiave_pubblica VARBINARY(1024) NOT NULL,
  pk_sign_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  pk_aaguid BINARY(16) NULL,
  pk_trasporti VARCHAR(100) NULL,
  pk_backup_eligible TINYINT(1) NOT NULL DEFAULT 0,
  pk_backed_up TINYINT(1) NOT NULL DEFAULT 0,
  pk_nome VARCHAR(80) NOT NULL,
  pk_creato_il DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pk_ultimo_uso DATETIME NULL,
  pk_revocato_il DATETIME NULL,
  UNIQUE KEY uq_passkey_credential (pk_credential_id),
  KEY ix_passkey_utente (utente_id, pk_revocato_il),
  CONSTRAINT fk_passkey_utente FOREIGN KEY (utente_id) REFERENCES utenti (utente_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_mfa_utente (
  utente_id INT NOT NULL PRIMARY KEY,
  mfa_user_handle BINARY(32) NOT NULL,
  mfa_creato_il DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mfa_handle (mfa_user_handle),
  CONSTRAINT fk_mfa_utente FOREIGN KEY (utente_id) REFERENCES utenti (utente_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Un'attivazione TOTP mai confermata non deve lasciare un segreto in giro.
DROP EVENT IF EXISTS ev_pulizia_totp_pendenti;
CREATE EVENT IF NOT EXISTS ev_pulizia_totp_pendenti
  ON SCHEDULE EVERY 1 HOUR
  DO DELETE FROM auth_totp
     WHERE totp_attivato_il IS NULL AND totp_creato_il < NOW() - INTERVAL 1 DAY;
