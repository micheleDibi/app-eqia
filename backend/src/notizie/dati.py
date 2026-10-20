"""Le tabelle delle notizie (migrazione 017).

- notizia: titolo, sottotitolo, riassunto, testo, link, immagine e sezione
  (tag_id, obbligatoria).
- notizia_gruppo: i gruppi di destinatari scelti, un ruolo per riga.
- notizia_partecipante: i destinatari, una riga per utente: gli utenti attivi
  dei gruppi scelti, ricalcolati a ogni salvataggio.
- notizia_allegato: i nomi dei file allegati.
- tag e tag_dettaglio: le sezioni e i loro argomenti. Li aggiunge, li
  disattiva e li riattiva solo il Nazionale; non si rinominano e non si
  cancellano, perche' le notizie li usano.
- notizia_tag_dettaglio: gli argomenti di una notizia, facoltativi, tutti
  della sua sezione.
- notizia_letta: chi ha aperto quale notizia.
"""

from __future__ import annotations

from datetime import datetime
from typing import Iterable, Optional

from sqlalchemy import bindparam, select, text
from sqlalchemy.orm import Session

from src.auth.models import ATTIVO
from src.auth.ruoli import CATALOGO_RUOLI
from src.clienti.models import Cliente
from src.utenti.models import Utente

# I gruppi dei destinatari, nell'ordine del catalogo condiviso: i ruoli che
# vedono la voce Notizie, tranne il Nazionale, che vede comunque tutte le
# notizie. Codice del ruolo -> ruoli.ruolo_id (= clienti.cliente_ruolo).
GRUPPI = {
    r["codice"]: r["id"] for r in CATALOGO_RUOLI
    if r["codice"] != "nazionale" and "notizie" in r["menu"]
}


def categorie(db: Session, *, anche_disattivati: bool = False) -> list[dict]:
    """Le sezioni, ciascuna con i suoi argomenti (`sottotag`), in ordine di
    id. Per le scelte del modulo e del filtro solo quelli attivi; per la
    gestione del Nazionale anche i disattivati, con `attivo`."""
    filtro_tag = "" if anche_disattivati else "WHERE tag_attivoSN = :attivo"
    filtro_sotto = "" if anche_disattivati else "WHERE tag_dettaglio_attivoSN = :attivo"
    principali = [dict(r) for r in db.execute(text(f"""
        SELECT tag_id, tag_descrizione, tag_attivoSN = :attivo AS attivo
          FROM tag {filtro_tag} ORDER BY tag_id
    """), {"attivo": ATTIVO}).mappings()]
    figli: dict[int, list[dict]] = {}
    for riga in db.execute(text(f"""
        SELECT tag_dettaglio_id, tag_id, tag_dettaglio_descrizione, tag_dettaglio_attivoSN = :attivo AS attivo
          FROM tag_dettaglio {filtro_sotto} ORDER BY tag_dettaglio_id
    """), {"attivo": ATTIVO}).mappings():
        figli.setdefault(riga["tag_id"], []).append({**riga, "attivo": bool(riga["attivo"])})
    return [{**t, "attivo": bool(t["attivo"]), "sottotag": figli.get(t["tag_id"], [])} for t in principali]


def sottotag_delle_notizie(db: Session, notizie: list[int]) -> dict[int, list[dict]]:
    """Gli argomenti di ciascuna notizia, anche se nel frattempo disattivati."""
    if not notizie:
        return {}
    risultato: dict[int, list[dict]] = {}
    for riga in db.execute(text("""
        SELECT nt.notizia_id, d.tag_dettaglio_id, d.tag_dettaglio_descrizione
          FROM notizia_tag_dettaglio nt
          JOIN tag_dettaglio d ON d.tag_dettaglio_id = nt.tag_dettaglio_id
         WHERE nt.notizia_id IN :notizie
         ORDER BY d.tag_dettaglio_id
    """).bindparams(bindparam("notizie", expanding=True)), {"notizie": notizie}).mappings():
        risultato.setdefault(riga["notizia_id"], []).append({
            "tag_dettaglio_id": riga["tag_dettaglio_id"],
            "tag_dettaglio_descrizione": riga["tag_dettaglio_descrizione"],
        })
    return risultato


_COLONNE_RIGA = """
    n.notizia_id, n.notizia_titolo, n.notizia_sottotitolo, n.notizia_riassunto,
    n.tag_id, t.tag_descrizione, n.notizia_created_at,
    COALESCE(n.notizia_immagine_filename, '') <> '' AS immagine
"""


def elenco(db: Session, utente_id: int, tutte: bool, skip: int, limit: int, *,
           tag_id: Optional[int] = None, tag_dettaglio_id: Iterable[int] = ()) -> list[dict]:
    """Dalla piu' recente, ciascuna con i suoi argomenti e con `letta` se
    l'utente l'ha gia' aperta. Il Nazionale le vede tutte, gli altri solo
    quelle di cui sono destinatari; i filtri tengono le notizie della sezione
    e quelle con almeno uno degli argomenti indicati."""
    sottotag_scelti = list(tag_dettaglio_id)
    # Senza argomenti niente condizione: un IN vuoto non troverebbe nulla.
    filtro_sottotag = """
           AND EXISTS (SELECT 1 FROM notizia_tag_dettaglio nt
                        WHERE nt.notizia_id = n.notizia_id AND nt.tag_dettaglio_id IN :sottotag)"""
    if not sottotag_scelti:
        filtro_sottotag = ""
    consulta = text(f"""
        SELECT {_COLONNE_RIGA},
               EXISTS (SELECT 1 FROM notizia_letta l
                        WHERE l.notizia_id = n.notizia_id AND l.utente_id = :utente) AS letta
          FROM notizia n
          LEFT JOIN tag t ON t.tag_id = n.tag_id
         WHERE (:tutte OR EXISTS (SELECT 1 FROM notizia_partecipante p
                                   WHERE p.notizia_id = n.notizia_id AND p.partecipante_id = :utente))
           AND (:tag IS NULL OR n.tag_id = :tag){filtro_sottotag}
         ORDER BY n.notizia_created_at DESC, n.notizia_id DESC
         LIMIT :limit OFFSET :skip
    """)
    parametri = {"tutte": tutte, "utente": utente_id, "limit": limit, "skip": skip, "tag": tag_id}
    if sottotag_scelti:
        consulta = consulta.bindparams(bindparam("sottotag", expanding=True))
        parametri["sottotag"] = sottotag_scelti
    righe = [dict(r) for r in db.execute(consulta, parametri).mappings()]
    sottotag = sottotag_delle_notizie(db, [r["notizia_id"] for r in righe])
    return [{**r, "immagine": bool(r["immagine"]), "letta": bool(r["letta"]),
             "sottotag": sottotag.get(r["notizia_id"], [])} for r in righe]


def da_leggere(db: Session, utente_id: int, tutte: bool) -> int:
    """Quante notizie l'utente non ha ancora aperto, fra quelle che vede: per
    il Nazionale tutte, per gli altri quelle di cui sono destinatari."""
    return db.execute(text("""
        SELECT COUNT(*)
          FROM notizia n
         WHERE (:tutte OR EXISTS (SELECT 1 FROM notizia_partecipante p
                                   WHERE p.notizia_id = n.notizia_id AND p.partecipante_id = :utente))
           AND NOT EXISTS (SELECT 1 FROM notizia_letta l
                            WHERE l.notizia_id = n.notizia_id AND l.utente_id = :utente)
    """), {"tutte": tutte, "utente": utente_id}).scalar_one()


def segna_letta(db: Session, notizia_id: int, utente_id: int, adesso: datetime) -> None:
    """Registra la prima apertura della notizia da parte dell'utente; le
    successive non cambiano nulla (UNIQUE su notizia e utente)."""
    db.execute(text("""
        INSERT IGNORE INTO notizia_letta (notizia_id, utente_id, notizia_letta_datetime)
        VALUES (:id, :utente, :adesso)
    """), {"id": notizia_id, "adesso": adesso, "utente": utente_id})


def notizia(db: Session, notizia_id: int, *, blocca: bool = False) -> Optional[dict]:
    riga = db.execute(text(f"""
        SELECT {_COLONNE_RIGA}, n.notizia_descrizione, n.notizia_url, n.notizia_immagine_filename,
               n.notizia_updated_at
          FROM notizia n
          LEFT JOIN tag t ON t.tag_id = n.tag_id
         WHERE n.notizia_id = :id
         {"FOR UPDATE" if blocca else ""}
    """), {"id": notizia_id}).mappings().first()
    return {**riga, "immagine": bool(riga["immagine"])} if riga else None


def destinatario(db: Session, notizia_id: int, utente_id: int) -> bool:
    return db.execute(text("""
        SELECT 1 FROM notizia_partecipante WHERE notizia_id = :id AND partecipante_id = :utente LIMIT 1
    """), {"id": notizia_id, "utente": utente_id}).first() is not None


def allegati(db: Session, notizia_id: int) -> list[dict]:
    return [dict(r) for r in db.execute(text("""
        SELECT notizia_allegato_id, notizia_allegato_nome_file
          FROM notizia_allegato
         WHERE notizia_id = :id
         ORDER BY notizia_allegato_id
    """), {"id": notizia_id}).mappings()]


def allegato(db: Session, notizia_id: int, allegato_id: int) -> Optional[dict]:
    riga = db.execute(text("""
        SELECT notizia_allegato_id, notizia_allegato_nome_file
          FROM notizia_allegato
         WHERE notizia_id = :id AND notizia_allegato_id = :allegato
    """), {"id": notizia_id, "allegato": allegato_id}).mappings().first()
    return dict(riga) if riga else None


def gruppi(db: Session, notizia_id: int) -> list[str]:
    """I gruppi scelti dal Nazionale, nell'ordine del catalogo."""
    ruoli = set(db.execute(text("SELECT ruolo_id FROM notizia_gruppo WHERE notizia_id = :id"),
                           {"id": notizia_id}).scalars())
    return [gruppo for gruppo, ruolo in GRUPPI.items() if ruolo in ruoli]


def numero_destinatari(db: Session, notizia_id: int) -> int:
    return db.execute(text("SELECT COUNT(*) FROM notizia_partecipante WHERE notizia_id = :id"),
                      {"id": notizia_id}).scalar_one()


def destinatari_dei_gruppi(db: Session, scelti: Iterable[str]) -> list[int]:
    """Gli utenti attivi dei gruppi scelti: una persona sola anche con
    piu' righe in clienti."""
    ruoli = [GRUPPI[g] for g in scelti]
    return list(db.scalars(
        select(Utente.utente_id).distinct()
        .join(Cliente, Cliente.utente_id == Utente.utente_id)
        .where(Utente.utente_attivoSN == ATTIVO, Cliente.cliente_ruolo.in_(ruoli))
        .order_by(Utente.utente_id)
    ))


def _campi(valori: dict) -> dict:
    return {
        "titolo": valori["notizia_titolo"], "sottotitolo": valori["notizia_sottotitolo"],
        "riassunto": valori["notizia_riassunto"], "descrizione": valori["notizia_descrizione"],
        "url": valori["notizia_url"], "tag": valori["tag_id"],
    }


def crea(db: Session, valori: dict, utente_id: int, adesso: datetime) -> int:
    risultato = db.execute(text("""
        INSERT INTO notizia
            (notizia_titolo, notizia_sottotitolo, notizia_riassunto, notizia_descrizione, notizia_url,
             notizia_immagine_filename, tag_id,
             notizia_created_by, notizia_created_at, notizia_updated_by, notizia_updated_at)
        VALUES (:titolo, :sottotitolo, :riassunto, :descrizione, :url,
                NULL, :tag, :utente, :adesso, :utente, :adesso)
    """), {**_campi(valori), "utente": utente_id, "adesso": adesso})
    return int(risultato.lastrowid)


def modifica(db: Session, notizia_id: int, valori: dict, utente_id: int, adesso: datetime) -> None:
    db.execute(text("""
        UPDATE notizia
           SET notizia_titolo = :titolo, notizia_sottotitolo = :sottotitolo, notizia_riassunto = :riassunto,
               notizia_descrizione = :descrizione, notizia_url = :url, tag_id = :tag,
               notizia_updated_by = :utente, notizia_updated_at = :adesso
         WHERE notizia_id = :id
    """), {**_campi(valori), "id": notizia_id, "utente": utente_id, "adesso": adesso})


def segna_modifica(db: Session, notizia_id: int, utente_id: int, adesso: datetime) -> None:
    """Chi ha cambiato per ultimo la notizia, anche solo l'immagine o gli
    allegati."""
    db.execute(text("""
        UPDATE notizia SET notizia_updated_by = :utente, notizia_updated_at = :adesso WHERE notizia_id = :id
    """), {"id": notizia_id, "utente": utente_id, "adesso": adesso})


def allinea_destinatari(db: Session, notizia_id: int, persone: list[int], adesso: datetime) -> None:
    """Le righe dei destinatari diventano esattamente `persone`: si tolgono
    quelle in piu' e si aggiungono quelle che mancano; le altre restano come
    sono, con le loro date."""
    attuali = set(db.execute(text("""
        SELECT partecipante_id FROM notizia_partecipante WHERE notizia_id = :id
    """), {"id": notizia_id}).scalars())
    nuove = set(persone)
    togliere = list(attuali - nuove)
    if togliere:
        db.execute(text("""
            DELETE FROM notizia_partecipante WHERE notizia_id = :id AND partecipante_id IN :togliere
        """).bindparams(bindparam("togliere", expanding=True)), {"id": notizia_id, "togliere": togliere})
    aggiungere = [p for p in persone if p not in attuali]
    if aggiungere:
        db.execute(text("""
            INSERT INTO notizia_partecipante (notizia_id, partecipante_id, notizia_partecipante_created_at)
            VALUES (:id, :persona, :adesso)
        """), [{"id": notizia_id, "persona": p, "adesso": adesso} for p in aggiungere])


def imposta_immagine(db: Session, notizia_id: int, nome: Optional[str], utente_id: int,
                     adesso: datetime) -> None:
    db.execute(text("""
        UPDATE notizia
           SET notizia_immagine_filename = :nome, notizia_updated_by = :utente, notizia_updated_at = :adesso
         WHERE notizia_id = :id
    """), {"id": notizia_id, "nome": nome, "utente": utente_id, "adesso": adesso})


def aggiungi_allegato(db: Session, notizia_id: int, nome: str, utente_id: int, adesso: datetime) -> int:
    risultato = db.execute(text("""
        INSERT INTO notizia_allegato
            (notizia_id, notizia_allegato_nome_file, notizia_allegato_created_by, notizia_allegato_created_at)
        VALUES (:id, :nome, :utente, :adesso)
    """), {"id": notizia_id, "nome": nome, "utente": utente_id, "adesso": adesso})
    segna_modifica(db, notizia_id, utente_id, adesso)
    return int(risultato.lastrowid)


def togli_allegato(db: Session, notizia_id: int, allegato_id: int, utente_id: int, adesso: datetime) -> None:
    db.execute(text("""
        DELETE FROM notizia_allegato WHERE notizia_id = :id AND notizia_allegato_id = :allegato
    """), {"id": notizia_id, "allegato": allegato_id})
    segna_modifica(db, notizia_id, utente_id, adesso)


def allinea_gruppi(db: Session, notizia_id: int, scelti: Iterable[str]) -> None:
    """Le righe dei gruppi diventano esattamente `scelti`, come per i
    destinatari: quelle che restano non cambiano."""
    nuovi = {GRUPPI[g] for g in scelti}
    attuali = set(db.execute(text("SELECT ruolo_id FROM notizia_gruppo WHERE notizia_id = :id"),
                             {"id": notizia_id}).scalars())
    togliere = list(attuali - nuovi)
    if togliere:
        db.execute(text("DELETE FROM notizia_gruppo WHERE notizia_id = :id AND ruolo_id IN :togliere")
                   .bindparams(bindparam("togliere", expanding=True)), {"id": notizia_id, "togliere": togliere})
    aggiungere = sorted(nuovi - attuali)
    if aggiungere:
        db.execute(text("INSERT INTO notizia_gruppo (notizia_id, ruolo_id) VALUES (:id, :ruolo)"),
                   [{"id": notizia_id, "ruolo": ruolo} for ruolo in aggiungere])


def allinea_sottotag(db: Session, notizia_id: int, scelti: list[int]) -> None:
    """Le righe degli argomenti diventano esattamente `scelti`, come per i
    destinatari: quelle che restano non cambiano."""
    attuali = set(db.execute(text("""
        SELECT tag_dettaglio_id FROM notizia_tag_dettaglio WHERE notizia_id = :id
    """), {"id": notizia_id}).scalars())
    togliere = [d for d in attuali if d not in scelti]
    if togliere:
        db.execute(text("""
            DELETE FROM notizia_tag_dettaglio WHERE notizia_id = :id AND tag_dettaglio_id IN :togliere
        """).bindparams(bindparam("togliere", expanding=True)), {"id": notizia_id, "togliere": togliere})
    aggiungere = [d for d in scelti if d not in attuali]
    if aggiungere:
        db.execute(text("""
            INSERT INTO notizia_tag_dettaglio (notizia_id, tag_dettaglio_id) VALUES (:id, :sottotag)
        """), [{"id": notizia_id, "sottotag": d} for d in aggiungere])


# =============================================================================
# Gestione di sezioni e argomenti (solo Nazionale)
# =============================================================================
def tag(db: Session, tag_id: int, *, blocca: bool = False) -> Optional[dict]:
    riga = db.execute(text(f"""
        SELECT tag_id, tag_descrizione, tag_attivoSN FROM tag WHERE tag_id = :id
        {"FOR UPDATE" if blocca else ""}
    """), {"id": tag_id}).mappings().first()
    return dict(riga) if riga else None


def sottotag(db: Session, tag_dettaglio_id: int, *, blocca: bool = False) -> Optional[dict]:
    riga = db.execute(text(f"""
        SELECT tag_dettaglio_id, tag_id, tag_dettaglio_descrizione, tag_dettaglio_attivoSN
          FROM tag_dettaglio WHERE tag_dettaglio_id = :id
        {"FOR UPDATE" if blocca else ""}
    """), {"id": tag_dettaglio_id}).mappings().first()
    return dict(riga) if riga else None


def nome_tag_usato(db: Session, nome: str) -> bool:
    """Una sezione con lo stesso nome, senza badare a maiuscole e spazi."""
    return db.execute(text("""
        SELECT 1 FROM tag WHERE LOWER(TRIM(tag_descrizione)) = LOWER(:nome) LIMIT 1
    """), {"nome": nome.strip()}).first() is not None


def nome_sottotag_usato(db: Session, tag_id: int, nome: str) -> bool:
    """Un argomento della stessa sezione con lo stesso nome."""
    return db.execute(text("""
        SELECT 1 FROM tag_dettaglio
         WHERE tag_id = :tag AND LOWER(TRIM(tag_dettaglio_descrizione)) = LOWER(:nome) LIMIT 1
    """), {"tag": tag_id, "nome": nome.strip()}).first() is not None


def crea_tag(db: Session, nome: str) -> int:
    risultato = db.execute(text("""
        INSERT INTO tag (tag_descrizione, tag_attivoSN) VALUES (:nome, :attivo)
    """), {"nome": nome, "attivo": ATTIVO})
    return int(risultato.lastrowid)


def crea_sottotag(db: Session, tag_id: int, nome: str) -> int:
    risultato = db.execute(text("""
        INSERT INTO tag_dettaglio (tag_id, tag_dettaglio_descrizione, tag_dettaglio_attivoSN)
        VALUES (:tag, :nome, :attivo)
    """), {"tag": tag_id, "nome": nome, "attivo": ATTIVO})
    return int(risultato.lastrowid)


def imposta_attivo_tag(db: Session, tag_id: int, valore: int) -> None:
    db.execute(text("UPDATE tag SET tag_attivoSN = :valore WHERE tag_id = :id"),
               {"id": tag_id, "valore": valore})


def imposta_attivo_sottotag(db: Session, tag_dettaglio_id: int, valore: int) -> None:
    db.execute(text("UPDATE tag_dettaglio SET tag_dettaglio_attivoSN = :valore WHERE tag_dettaglio_id = :id"),
               {"id": tag_dettaglio_id, "valore": valore})


def elimina(db: Session, notizia_id: int) -> None:
    """La notizia e le righe collegate, figlie prima. I file restano
    nell'archivio."""
    for tabella in ("notizia_tag_dettaglio", "notizia_allegato", "notizia_partecipante",
                    "notizia_gruppo", "notizia_letta", "notizia"):
        db.execute(text(f"DELETE FROM {tabella} WHERE notizia_id = :id"), {"id": notizia_id})
