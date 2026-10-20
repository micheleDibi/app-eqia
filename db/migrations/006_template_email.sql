-- =============================================================================
-- 006 - TEMPLATE EMAIL DEL RECUPERO PASSWORD
-- =============================================================================
-- DB        : admin_entedb (MariaDB 10.11, InnoDB, utf8mb4_unicode_ci)
-- Rollback  : db/rollback/006_template_email_down.sql
-- Dipende da: nessuna
-- Idempotente: si (INSERT ... ON DUPLICATE KEY UPDATE dopo la UNIQUE)
--
-- Si riusa la tabella `messaggi_email` gia' presente (10 template attivi, es.
-- 'pratica_caricata', 'nuovo_contatto_1'), cosi' i testi restano modificabili
-- senza rideploy, come per il resto della piattaforma.
--
-- CONVENZIONE SEGNAPOSTO: {{nome}}. La sostituzione avviene lato applicazione
-- con escaping HTML di OGNI valore dinamico. Il link di reset e' l unico
-- valore inserito come URL e va costruito lato server, mai da input utente.
-- =============================================================================

START TRANSACTION;

-- La colonna codice non aveva vincoli: serve per rendere idempotente l upsert.
-- Se questa ALTER fallisce, hai codici duplicati: bonificali prima.
ALTER TABLE `messaggi_email`
  ADD UNIQUE KEY IF NOT EXISTS `uq_messaggi_email_codice` (`messaggio_email_codice`);

-- -----------------------------------------------------------------------------
-- Template 1 - richiesta di reset (requisito 7)
-- Segnaposto: {{nome}}, {{link_reset}}, {{scadenza_minuti}}
-- -----------------------------------------------------------------------------
INSERT INTO `messaggi_email`
  (`messaggio_email_codice`, `messaggio_email_oggetto`, `messaggio_email_testo`)
VALUES (
  'password_reset_richiesta',
  'Reimposta la tua password',
  CONCAT(
    '<p>Gentile {{nome}},</p>',
    '<p>abbiamo ricevuto una richiesta di reimpostazione della password per il tuo account ERSAF.</p>',
    '<p style="margin:24px 0;">',
      '<a href="{{link_reset}}" style="background:#1e3a8a;color:#ffffff;padding:12px 24px;',
      'border-radius:9999px;text-decoration:none;display:inline-block;">Reimposta la password</a>',
    '</p>',
    '<p>Se il pulsante non funziona, copia e incolla questo indirizzo nel browser:<br />',
    '<span style="word-break:break-all;">{{link_reset}}</span></p>',
    '<p><strong>Il link scade tra {{scadenza_minuti}} minuti</strong> e puo essere usato una sola volta.</p>',
    '<p>Se non hai richiesto tu il cambio password, ignora questa mail: la tua password attuale resta valida. ',
    'Nessuno puo modificarla senza questo link.</p>',
    '<p>Per sicurezza non rispondere a questo messaggio e non inoltrarlo a nessuno.</p>',
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

-- -----------------------------------------------------------------------------
-- Template 2 - notifica di avvenuto cambio (requisito 15)
-- Segnaposto: {{nome}}, {{data_ora}}, {{indirizzo_ip}}
-- NON deve MAI contenere la nuova password ne un link con token.
-- -----------------------------------------------------------------------------
INSERT INTO `messaggi_email`
  (`messaggio_email_codice`, `messaggio_email_oggetto`, `messaggio_email_testo`)
VALUES (
  'password_reset_eseguito',
  'La tua password e stata modificata',
  CONCAT(
    '<p>Gentile {{nome}},</p>',
    '<p>ti confermiamo che la password del tuo account ERSAF e stata modificata il ',
    '<strong>{{data_ora}}</strong> dall indirizzo IP {{indirizzo_ip}}.</p>',
    '<p>Tutte le sessioni attive sono state chiuse: dovrai accedere di nuovo su ogni ',
    'dispositivo, applicazione ERSAPP compresa.</p>',
    '<p><strong>Non sei stato tu?</strong> Contatta subito il tuo centro ERSAF di competenza ',
    'o scrivi a info@ersaf.it.</p>',
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

-- -----------------------------------------------------------------------------
-- VERIFICA
--   SELECT messaggio_email_id, messaggio_email_codice, messaggio_email_oggetto
--     FROM messaggi_email
--    WHERE messaggio_email_codice LIKE 'password_reset%';
--
-- NOTA SULLE CREDENZIALI SMTP
--   Nel DB esiste la tabella `mail` con host, porta e PASSWORD IN CHIARO della
--   casella di invio: e' l impostazione della piattaforma legacy. La nuova
--   applicazione NON deve leggerle da li'. Le credenziali vanno in .env
--   (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM) e .env resta
--   fuori dal repository.
