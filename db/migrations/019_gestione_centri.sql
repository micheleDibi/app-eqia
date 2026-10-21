-- Gerarchia e titolarita dei centri, senza dati del gestionale di origine.
ALTER TABLE aziende
    ADD COLUMN azienda_padre_id INT NULL,
    ADD COLUMN azienda_created_by INT NULL,
    ADD CONSTRAINT fk_centro_padre FOREIGN KEY (azienda_padre_id) REFERENCES aziende(azienda_id),
    ADD CONSTRAINT fk_centro_autore FOREIGN KEY (azienda_created_by) REFERENCES utenti(utente_id);
