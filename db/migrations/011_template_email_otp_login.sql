-- =============================================================================
-- 011 - TEMPLATE EMAIL OTP LOGIN NAZIONALE
-- =============================================================================
-- DB        : admin_entedb (MariaDB 10.11, InnoDB, utf8mb4_unicode_ci)
-- Rollback  : db/rollback/011_template_email_otp_login_down.sql
-- Dipende da: 006 (UNIQUE su messaggi_email.messaggio_email_codice)
-- Idempotente: si (ON DUPLICATE KEY UPDATE)
--
-- Nessuna modifica di schema: logs_otp e messaggi_email esistono gia' cosi'
-- come sono. Si inserisce solo il nuovo template email.
-- Segnaposto: {{nome}}, {{codice_otp}}, {{scadenza_minuti}}
-- =============================================================================

START TRANSACTION;

INSERT INTO `messaggi_email`
  (`messaggio_email_codice`, `messaggio_email_oggetto`, `messaggio_email_testo`)
VALUES (
  'login_otp_nazionale',
  'Codice OTP per l''accesso alla piattaforma',
  CONCAT(
    '<p>Gentile {{nome}},</p>',
    '<p>ricevi questa e-mail a seguito di un tentativo di accesso alla piattaforma uni.ersaf.it.</p>',
    '<p>Per poter procedere, inserisci il seguente codice OTP:</p>',
    '<p style="margin:24px 0;font-size:28px;font-weight:bold;letter-spacing:6px;color:#1e3a8a;">{{codice_otp}}</p>',
    '<p>Il codice scade tra <strong>{{scadenza_minuti}} minuti</strong> e puo essere usato una sola volta.</p>',
    '<p>Se non hai effettuato tu questo tentativo di accesso, ignora questa email.</p>',
    '<p>Distintamente</p>',
    '<p><strong>Ente di Ricerca Scientifica ed Alta Formazione in sigla ERSAF</strong><br />',
    'P.zza del Popolo, N&deg;18<br />00187 Roma (Rm)<br />',
    'Cod. Fisc. 97905810582 P.Iva 14061981008<br />',
    'Tel: 06-92949895 Mail: info@ersaf.it<br />Web: https://www.ersaf.it</p>'
  )
)
ON DUPLICATE KEY UPDATE
  `messaggio_email_oggetto` = VALUES(`messaggio_email_oggetto`),
  `messaggio_email_testo`   = VALUES(`messaggio_email_testo`);

COMMIT;