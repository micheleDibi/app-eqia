-- =============================================================================
-- 012 - TEMPLATE EMAIL: VERIFICA CONTATTI E CREDENZIALI DI ACCESSO
-- =============================================================================
-- DB        : admin_entedb (MariaDB 10.11, InnoDB, utf8mb4_unicode_ci)
-- Rollback  : db/rollback/012_template_email_verifica_contatti_down.sql
-- Dipende da: 006 (UNIQUE su messaggi_email.messaggio_email_codice)
-- Idempotente: si (ON DUPLICATE KEY UPDATE)
--
-- Nessuna modifica di schema: senza queste due righe, invia_mail_otp (per la
-- verifica email) e invia_mail_credenziali falliscono con ErroreTemplateEmail
-- perche' carica_template non trova il codice cercato.
-- =============================================================================

START TRANSACTION;

-- Segnaposto: {{nome}}, {{codice_otp}}, {{scadenza_minuti}}
INSERT INTO `messaggi_email`
  (`messaggio_email_codice`, `messaggio_email_oggetto`, `messaggio_email_testo`)
VALUES (
  'otp_verifica_email',
  'Codice OTP per la verifica della tua email',
  CONCAT(
    '<p>Gentile {{nome}},</p>',
    '<p>ricevi questa e-mail a seguito della registrazione sulla piattaforma Equia.</p>',
    '<p>Per confermare il tuo indirizzo email, inserisci il seguente codice OTP:</p>',
    '<p style="margin:24px 0;font-size:28px;font-weight:bold;letter-spacing:6px;color:#1e3a8a;">{{codice_otp}}</p>',
    '<p>Il codice scade tra <strong>{{scadenza_minuti}} minuti</strong> e puo essere usato una sola volta.</p>',
    '<p>Se non hai richiesto tu questa registrazione, ignora questa email.</p>',
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

-- Segnaposto: {{nome}}, {{username}}, {{password}}, {{istruzioni_accesso}}
INSERT INTO `messaggi_email`
  (`messaggio_email_codice`, `messaggio_email_oggetto`, `messaggio_email_testo`)
VALUES (
  'credenziali_accesso',
  'Credenziali Piattaforma Web ERSAF',
  CONCAT(
    '<p>Benvenuto {{nome}},</p>',
    '<p>ricevi questa mail poiché sei stato anagrafato presso uno dei centri ERSAF presenti sul territorio nazionale.</p>',
    '<p>{{istruzioni_accesso}}</p>',
    '<p><strong>Username:</strong> {{username}}<br /><strong>Password:</strong> {{password}}</p>',
    '<p>Conserva queste credenziali in un luogo sicuro.</p>',
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