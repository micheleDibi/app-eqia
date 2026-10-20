"""Visibilità delle anagrafiche nella gerarchia degli account.

La regola viene da `Ricerca Figli` della piattaforma legacy:

- il Nazionale vede tutto;
- "me" e' la riga `clienti` dell'utente loggato che sceglierebbe
  `cliente_principale`, e la sua `azienda_id` e' l'azienda dell'utente;
- le radici sono l'utente loggato piu' gli utenti che hanno una riga `clienti`
  in quella azienda (i colleghi);
- sono visibili "me" e tutte le righe `clienti` degli utenti che discendono da
  una radice lungo `utenti.utente_padre`, anche passando per utenti senza
  alcuna riga `clienti`. Una radice non e' visibile in quanto radice: lo
  diventa solo se e' anche discendente, per esempio dentro un ciclo.

E' l'unico punto del backend che contiene la regola: i router la chiamano, non
la riscrivono.

LA RICORSIONE SU MARIADB
    Superato `max_recursive_iterations` (1000 per difetto), MariaDB non da'
    errore: restituisce un risultato parziale con il solo warning 1931, e
    PyMySQL non lo trasforma in nulla. Una catena piu' profonda di 1000 livelli
    renderebbe invisibili dei clienti senza alcun segnale. Per questo un
    listener sull'engine riconosce gli statement della regola dal nome della
    CTE, alza il limite per quel solo statement, e se il troncamento avviene
    comunque solleva `RicorsioneTroncata`: il risultato e' completo oppure e'
    un errore, mai incompleto in silenzio. Con `UNION` distinct la ricorsione
    si ferma da sola anche sui cicli, dopo al piu' |utenti| + 1 passi.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from sqlalchemy import case, event, literal, or_, select, union
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, aliased

from src.auth.autorizzazioni import ruolo_di
from src.auth.dipendenze import get_current_utente
from src.auth.models import RUOLI_ATTUATORE
from src.clienti.models import Cliente
from src.database import engine, get_db
from src.utenti.models import Utente

NOME_CTE = "vis_discendenti"
# Costanti di modulo e non argomenti: il listener le legge a ogni esecuzione,
# e i test le abbassano per provocare il troncamento.
MAX_ITERAZIONI = 100_000
TEMPO_MASSIMO_S = 10
CODICE_TRONCAMENTO = 1931

_MARCATORE = re.compile(rf"\b{NOME_CTE}\b")


@dataclass(frozen=True)
class Visibilita:
    """Solo valori scalari: resta valida anche dopo un commit, quando gli
    oggetti ORM della sessione sono scaduti."""

    utente_id: int
    nazionale: bool
    me_cliente_id: int | None = None
    azienda_id: int | None = None


class RicorsioneNonVerificata(SQLAlchemyError):
    """La completezza della visibilita' non si puo' garantire.

    Sottoclasse di SQLAlchemyError: l'handler globale di main.py la trasforma
    nel 500 generico, senza dettagli nel corpo.
    """


class RicorsioneTroncata(RicorsioneNonVerificata):
    """MariaDB ha interrotto la CTE: il risultato sarebbe stato parziale."""


# =============================================================================
# Chi e' l'utente
# =============================================================================
def riga_di_me(db: Session, utente_id: int):
    """(cliente_id, azienda_id) della riga "me", o None.

    Stesso ordinamento di `cliente_principale` (servizio_login.py): prima le
    righe con ruolo attuatore, poi il cliente_id piu' basso. Quella funzione non
    seleziona azienda_id e non si tocca, perche' altrove la si usa per il
    ruolo; un test verifica che le due scelgano sempre la stessa riga.
    """
    return db.execute(
        select(Cliente.cliente_id, Cliente.azienda_id)
        .where(Cliente.utente_id == utente_id)
        .order_by(*_ordine_riga_me(Cliente))
        .limit(1)
    ).first()


def _ordine_riga_me(cliente):
    return (case((cliente.cliente_ruolo.in_(RUOLI_ATTUATORE), 0), else_=1), cliente.cliente_id)


def cliente_di_utente(colonna_utente):
    """Il cliente_id della riga "me" dell'utente in `colonna_utente`, come
    sottoquery correlata: la stessa riga che sceglie riga_di_me.

    correlate_except: la tabella di `colonna_utente` e' sempre quella della
    query esterna. Senza, dentro un EXISTS SQLAlchemy la rimetterebbe nel FROM
    della sottoquery, che prenderebbe il cliente di una riga qualsiasi."""
    cliente = aliased(Cliente, name="riga_me")
    return (select(cliente.cliente_id)
            .where(cliente.utente_id == colonna_utente)
            .order_by(*_ordine_riga_me(cliente))
            .limit(1)
            .correlate_except(cliente)
            .scalar_subquery())


def visibilita_di(db: Session, utente: Utente) -> Visibilita:
    utente_id = utente.utente_id
    if (ruolo_di(db, utente_id) or "").lower() == "nazionale":
        return Visibilita(utente_id=utente_id, nazionale=True)
    me = riga_di_me(db, utente_id)
    return Visibilita(
        utente_id=utente_id,
        nazionale=False,
        me_cliente_id=me.cliente_id if me else None,
        azienda_id=me.azienda_id if me else None,
    )


def visibilita_corrente(
    db: Session = Depends(get_db),
    utente: Utente = Depends(get_current_utente),
) -> Visibilita:
    """Dipendenza FastAPI: calcolata una volta per richiesta, sulla stessa
    sessione della rotta."""
    return visibilita_di(db, utente)


# =============================================================================
# Clienti
# =============================================================================
def sottoquery_clienti(vis: Visibilita):
    """SELECT dei cliente_id visibili, oppure None per il Nazionale.

    Si usa come `Cliente.cliente_id.in_(...)`. Ogni chiamata crea una CTE
    nuova con lo stesso nome, e SQLAlchemy non compila due CTE omonime nello
    stesso statement: la sottoquery va usata UNA volta per statement.
    """
    if vis.nazionale:
        return None

    colleghi = aliased(Cliente, name="vis_colleghi")
    radici = select(literal(vis.utente_id).label("utente_id"))
    if vis.azienda_id is not None:
        # Uguaglianza, mai `<=>`: con l'azienda NULL tutti gli utenti senza
        # azienda diventerebbero colleghi fra loro. Il ramo semplicemente non
        # esiste.
        radici = union(
            radici,
            select(colleghi.utente_id.label("utente_id")).where(
                colleghi.azienda_id == vis.azienda_id
            ),
        )
    radici = radici.cte("vis_radici")

    primo = aliased(Utente, name="vis_u1")
    successivo = aliased(Utente, name="vis_u2")
    # Si parte dai FIGLI delle radici, non dalle radici: i colleghi non sono
    # visibili in quanto colleghi. Nessun EXISTS su clienti: la catena
    # prosegue anche attraverso utenti senza anagrafica.
    discendenti = (
        select(primo.utente_id.label("utente_id"))
        .join(radici, primo.utente_padre == radici.c.utente_id)
        .cte(NOME_CTE, recursive=True)
    )
    # union() e non union_all(): e' cio' che fa terminare i cicli.
    discendenti = discendenti.union(
        select(successivo.utente_id).join(
            discendenti, successivo.utente_padre == discendenti.c.utente_id
        )
    )

    visibili = aliased(Cliente, name="vis_c")
    condizione = visibili.utente_id.in_(select(discendenti.c.utente_id))
    if vis.me_cliente_id is not None:
        # OR e non UNION: cosi' MariaDB materializza la CTE una volta sola e
        # aggancia il cliente per chiave primaria.
        condizione = or_(visibili.cliente_id == vis.me_cliente_id, condizione)
    # correlate(None): senza, SQLAlchemy correlerebbe `clienti` con la tabella
    # omonima della query che usa la sottoquery.
    return select(visibili.cliente_id).where(condizione).correlate(None)


def clienti_visibili(db: Session, utente: Utente):
    return sottoquery_clienti(visibilita_di(db, utente))


def filtra_clienti(query, vis: Visibilita):
    """Aggiunge il filtro a una query ORM su Cliente, prima di ordinamento e
    paginazione."""
    sotto = sottoquery_clienti(vis)
    return query if sotto is None else query.filter(Cliente.cliente_id.in_(sotto))


def _esiste(db: Session, query) -> bool:
    return db.execute(query.limit(1)).first() is not None


def cliente_visibile(db: Session, vis: Visibilita, cliente_id: int) -> bool:
    query = select(Cliente.cliente_id).where(Cliente.cliente_id == cliente_id)
    sotto = sottoquery_clienti(vis)
    if sotto is not None:
        query = query.where(Cliente.cliente_id.in_(sotto))
    return _esiste(db, query)


def cliente_visibile_o_404(
    db: Session, vis: Visibilita, cliente_id: int, messaggio: str
) -> None:
    """404 con `messaggio`, che deve essere quello di un id inesistente.

    Per un non Nazionale inesistente e non visibile falliscono lo stesso
    controllo, quindi la risposta e' identica e non rivela nulla. Per il
    Nazionale non fa nulla: l'esistenza la verifica la rotta, come prima.
    """
    if vis.nazionale:
        return
    if not cliente_visibile(db, vis, cliente_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=messaggio)


def utente_visibile(db: Session, vis: Visibilita, utente_id: int) -> bool:
    """Vero se l'utente ha almeno una riga `clienti` visibile."""
    query = select(Cliente.cliente_id).where(Cliente.utente_id == utente_id)
    sotto = sottoquery_clienti(vis)
    if sotto is not None:
        query = query.where(Cliente.cliente_id.in_(sotto))
    return _esiste(db, query)


# =============================================================================
# Protezione della ricorsione
# =============================================================================
def _statement_della_regola(statement: str, executemany: bool) -> bool:
    return not executemany and _MARCATORE.search(statement) is not None


@event.listens_for(engine, "before_cursor_execute", retval=True)
def _alza_limite_ricorsione(conn, cursor, statement, parameters, context, executemany):
    if not _statement_della_regola(statement, executemany):
        return statement, parameters
    if not getattr(conn.dialect, "is_mariadb", False):
        return statement, parameters
    if context is not None and context.execution_options.get("stream_results"):
        # Con un cursore non bufferizzato i warning si leggono solo dopo aver
        # consumato tutte le righe: il troncamento non sarebbe verificabile.
        raise RicorsioneNonVerificata(
            "la visibilita' dei clienti non si calcola con stream_results"
        )
    # Solo per questo statement: le connessioni del pool restano come sono.
    prefisso = (
        f"SET STATEMENT max_recursive_iterations = {int(MAX_ITERAZIONI)}, "
        f"max_statement_time = {int(TEMPO_MASSIMO_S)} FOR "
    )
    return prefisso + statement, parameters


@event.listens_for(engine, "after_cursor_execute")
def _verifica_troncamento(conn, cursor, statement, parameters, context, executemany):
    if not _statement_della_regola(statement, executemany):
        return
    if not getattr(conn.dialect, "is_mariadb", False):
        return
    if not getattr(cursor, "warning_count", 0):
        return
    # Connessione grezza: nessun evento SQLAlchemy, nessun rientro. Il cursore
    # e' bufferizzato, quindi le righe sono gia' state lette.
    avvisi = cursor.connection.show_warnings()
    # Warning presenti ma elenco vuoto (max_error_count = 0): non si puo'
    # escludere il troncamento, quindi si fallisce.
    if not avvisi or any(int(avviso[1]) == CODICE_TRONCAMENTO for avviso in avvisi):
        raise RicorsioneTroncata(
            "la visibilita' dei clienti non e' stata calcolata per intero"
        )
