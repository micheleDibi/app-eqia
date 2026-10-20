import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from src.config import get_impostazioni
from src.database_trasporto import configura as configura_trasporto
from src.database_trasporto import limiti_pool

_impostazioni = get_impostazioni()

# Fallback INERTE, non piu' `mysql+pymysql://root:1234@localhost` (rilievo S6
# dell'analisi): in assenza di .env l'applicazione tentava di connettersi con
# credenziali di default senza dirlo a nessuno. Ora, se DATABASE_URL manca,
# l'app non parte comunque — ci pensa verifica_configurazione() nel lifespan —
# ma l'import non esplode, cosi' la raccolta dei test resta possibile.
#
# TEST_DATABASE_URL ha la precedenza: e' il DB dedicato usato dalla suite.
SQLALCHEMY_DATABASE_URL = (
    os.getenv("TEST_DATABASE_URL")
    or _impostazioni.database_url
    or "sqlite+pysqlite:///:memory:"
)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    **limiti_pool(SQLALCHEMY_DATABASE_URL),
    # La piattaforma legacy tiene MariaDB con un wait_timeout basso: senza
    # questi due, la prima richiesta dopo una pausa fallisce con "server has
    # gone away".
    pool_pre_ping=True,
    pool_recycle=1800,
    # CRITICO per il requisito "nessun valore sensibile nei log": senza,
    # ogni errore SQLAlchemy porta "[parameters: ('a3f9...',)]" nel messaggio
    # dell'eccezione, cioe' l'impronta del token, e quel messaggio finisce nel
    # traceback e nella risposta di errore.
    hide_parameters=True,
    # MAI True: il logger sqlalchemy.engine stamperebbe ogni statement con i
    # parametri.
    echo=False,
    future=True,
)

configura_trasporto(engine, get_impostazioni)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
