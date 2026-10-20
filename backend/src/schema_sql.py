"""Esecuzione di file .sql con piu' statement.

I file di db/ contengono START TRANSACTION/COMMIT e CREATE EVENT ... DO
DELETE ...; cioe' punti e virgola dentro un costrutto. Uno splitter ingenuo su
";" li spezzerebbe. Qui si passa l'intero file in una sola execute() con
CLIENT.MULTI_STATEMENTS: il parsing lo fa il server, che e' l'unico a saperlo
fare bene.

Limite dichiarato: se un giorno una migrazione contenesse una stored procedure
con un corpo BEGIN...END servirebbe la direttiva DELIMITER, che e' un costrutto
del client e non del server. A quel punto questa funzione andra' sostituita con
una chiamata al binario `mariadb`. Nessuna delle 001-008 e' in quel caso.
"""

from __future__ import annotations

from pathlib import Path

import pymysql
from pymysql.constants import CLIENT
from sqlalchemy.engine import make_url


def esegui_file_sql(url_database: str, percorso: Path) -> None:
    esegui_sql(url_database, percorso.read_text(encoding="utf-8"))


def esegui_sql(url_database: str, sql: str) -> None:
    url = make_url(url_database)
    connessione = pymysql.connect(
        host=url.host,
        port=url.port or 3306,
        user=url.username,
        password=url.password,
        database=url.database,
        charset="utf8mb4",
        client_flag=CLIENT.MULTI_STATEMENTS,
        autocommit=True,
    )
    try:
        with connessione.cursor() as cursore:
            cursore.execute(sql)
            # Scorre tutti i result set, altrimenti la connessione resta con
            # dati non letti e la chiusura fallisce.
            while cursore.nextset():
                pass
    finally:
        connessione.close()
