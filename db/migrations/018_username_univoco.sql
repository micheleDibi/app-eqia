-- L'identità di login è univoca con la collation della tabella.
-- In presenza di doppioni la migrazione si ferma, senza rinominare account.
ALTER TABLE utenti ADD UNIQUE KEY uq_utenti_username (utente_username);
