-- 014 - Contenuti email uniformi al modello FindYourGoal.
-- Richiede 006, 011, 012 e il renderer comune notifiche/layout_email.py.
-- Aggiorna esclusivamente i cinque codici della nuova piattaforma.
-- I contenuti restano modificabili in messaggi_email; stili e firma nel codice.
-- Prima del rilascio salvare le cinque righe se personalizzate: rollback dati
-- tramite ripristino della copia, mai rieseguendo vecchi seed indiscriminati.
-- Nessuna modifica di schema, sessioni, token, OTP o provider.
START TRANSACTION;

INSERT INTO messaggi_email (messaggio_email_codice, messaggio_email_oggetto, messaggio_email_testo)
VALUES ('password_reset_richiesta', 'Recupero password — Equia', '<p>Gentile {{nome}},</p>
<p>abbiamo ricevuto una richiesta di reimpostazione della password per il tuo account <strong>Equia</strong>.</p>
<p>Per scegliere una nuova password, premi il pulsante seguente:</p>
<p><a class="email-azione" href="{{link_reset}}">Imposta nuova password</a></p>
<p class="email-nota">Il link scade tra <strong>{{scadenza_minuti}} minuti</strong> e può essere usato una sola volta.</p>
<p class="email-nota">Se il pulsante non funziona, copia questo indirizzo nel browser:<br><span class="email-credenziale">{{link_reset}}</span></p>
<p class="email-nota">Se non hai richiesto il cambio, puoi ignorare questa email: la password attuale resta valida. Non inoltrare questo messaggio e non condividere il link.</p>')
ON DUPLICATE KEY UPDATE messaggio_email_oggetto=VALUES(messaggio_email_oggetto), messaggio_email_testo=VALUES(messaggio_email_testo);

INSERT INTO messaggi_email (messaggio_email_codice, messaggio_email_oggetto, messaggio_email_testo)
VALUES ('password_reset_eseguito', 'Password modificata — Equia', '<p>Gentile {{nome}},</p>
<p>ti confermiamo che la password del tuo account <strong>Equia</strong> è stata modificata.</p>
<div class="email-riquadro"><p><strong>Data e ora:</strong> {{data_ora}}</p><p><strong>Indirizzo IP:</strong> {{indirizzo_ip}}</p></div>
<p>Le sessioni attive sono state chiuse. Per continuare, accedi di nuovo sui tuoi dispositivi.</p>
<p class="email-nota"><strong>Non sei stato tu?</strong> Contatta subito il tuo centro ERSAF di competenza o scrivi a <a href="mailto:info@ersaf.it">info@ersaf.it</a>.</p>')
ON DUPLICATE KEY UPDATE messaggio_email_oggetto=VALUES(messaggio_email_oggetto), messaggio_email_testo=VALUES(messaggio_email_testo);

INSERT INTO messaggi_email (messaggio_email_codice, messaggio_email_oggetto, messaggio_email_testo)
VALUES ('login_otp_nazionale', 'Codice di accesso — Equia', '<p>Gentile {{nome}},</p>
<p>hai richiesto di accedere al tuo account <strong>Equia</strong>. Per completare l''accesso, inserisci questo codice nella schermata di verifica:</p>
<div class="email-riquadro"><p class="email-codice">{{codice_otp}}</p></div>
<p class="email-nota">Il codice scade tra <strong>{{scadenza_minuti}} minuti</strong> e può essere usato una sola volta. Non condividerlo con nessuno.</p>
<p class="email-nota">Se non hai richiesto l''accesso, ignora questa email. Per proteggere il tuo account, ti consigliamo di cambiare la password.</p>')
ON DUPLICATE KEY UPDATE messaggio_email_oggetto=VALUES(messaggio_email_oggetto), messaggio_email_testo=VALUES(messaggio_email_testo);

INSERT INTO messaggi_email (messaggio_email_codice, messaggio_email_oggetto, messaggio_email_testo)
VALUES ('otp_verifica_email', 'Conferma il tuo indirizzo email — Equia', '<p>Gentile {{nome}},</p>
<p>per confermare il tuo indirizzo email su <strong>Equia</strong>, inserisci questo codice nella schermata di verifica:</p>
<div class="email-riquadro"><p class="email-codice">{{codice_otp}}</p></div>
<p class="email-nota">Il codice scade tra <strong>{{scadenza_minuti}} minuti</strong> e può essere usato una sola volta. Non condividerlo con nessuno.</p>
<p class="email-nota">Se non riconosci questa richiesta, puoi ignorare questa email.</p>')
ON DUPLICATE KEY UPDATE messaggio_email_oggetto=VALUES(messaggio_email_oggetto), messaggio_email_testo=VALUES(messaggio_email_testo);

INSERT INTO messaggi_email (messaggio_email_codice, messaggio_email_oggetto, messaggio_email_testo)
VALUES ('credenziali_accesso', 'Benvenuto su Equia', '<p>Gentile {{nome}},</p>
<p>il tuo account <strong>Equia</strong> è stato attivato dopo la verifica dei recapiti. Di seguito trovi le tue credenziali di accesso:</p>
<div class="email-riquadro"><p><strong>Username:</strong> <span class="email-credenziale">{{username}}</span></p><p><strong>Password:</strong> <span class="email-credenziale">{{password}}</span></p></div>
<p>{{istruzioni_accesso}}</p>
<p class="email-nota">Conserva le credenziali in un luogo sicuro e non condividere questa email. Per assistenza, rivolgiti al tuo centro ERSAF di competenza.</p>
<p class="email-nota">Se non riconosci questo account, contatta il tuo centro ERSAF.</p>')
ON DUPLICATE KEY UPDATE messaggio_email_oggetto=VALUES(messaggio_email_oggetto), messaggio_email_testo=VALUES(messaggio_email_testo);

COMMIT;
