"""Bootstrap incrementale su un database locale vuoto e dedicato."""
from sqlalchemy.engine import make_url
from src.migrazioni import applica_schema


def verifica_destinazione(url_database):
    url = make_url(url_database)
    consentiti = {("eqia_dev", 3318), ("ersaf_test", 3319)}
    if url.host not in {"127.0.0.1", "localhost"} or (url.database, url.port) not in consentiti:
        raise ValueError("Bootstrap consentito soltanto sui database locali dedicati Equia.")


def inizializza(url_database):
    verifica_destinazione(url_database)
    applica_schema(url_database)
