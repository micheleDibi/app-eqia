"""Policy MariaDB comune: TLS verificato, eccezione privata esplicita e timeout."""

import ipaddress
import ssl
from urllib.parse import parse_qsl, urlsplit

from sqlalchemy import event
from sqlalchemy.engine import make_url


def opzioni(indirizzo, impostazioni):
    try:
        url = make_url(indirizzo)
        campi = [k.lower() for k, _ in parse_qsl(urlsplit(indirizzo).query)]
        if len(campi) != len(set(campi)) or any(k != "charset" for k in campi):
            raise ValueError()
        if url.drivername not in ("mysql+pymysql", "mariadb+pymysql"):
            raise ValueError()
    except Exception:
        raise ValueError(
            "Configurazione DATABASE_URL non valida; parametri di trasporto solo nei campi dedicati."
        ) from None
    args = dict(
        connect_timeout=5,
        read_timeout=10,
        write_timeout=10,
        init_command="SET SESSION sql_mode='STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'",
    )
    if impostazioni.ersaf_env != "produzione":
        return args
    modo = getattr(impostazioni, "database_trasporto", "verify-full")
    ca = getattr(impostazioni, "database_ca_file", "")
    if modo == "rete-privata" and not ca and privato(url.host):
        return dict(args, ssl_disabled=True)
    if modo != "verify-full" or not ca:
        raise ValueError(
            "DATABASE_TRASPORTO richiede verify-full e DATABASE_CA_FILE; rete-privata e ammesso solo con IPv4 RFC1918."
        )
    try:
        # Nessun fallback al trust store del sistema operativo.
        contesto = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        contesto.minimum_version = ssl.TLSVersion.TLSv1_2
        contesto.load_verify_locations(cafile=ca)
    except (OSError, ssl.SSLError):
        raise ValueError("DATABASE_CA_FILE non contiene una CA leggibile e valida.") from None
    return dict(args, ssl=contesto)


def privato(host):
    try:
        ip = ipaddress.IPv4Address(host)
        return any(
            ip in ipaddress.IPv4Network(rete) for rete in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")
        )
    except (ValueError, TypeError):
        return False


def configura(engine, impostazioni):
    if engine.dialect.name not in ("mysql", "mariadb"):
        return

    @event.listens_for(engine, "do_connect")
    def prima_connessione(dialect, record, args, kwargs):
        kwargs.update(opzioni(engine.url.render_as_string(hide_password=False), impostazioni()))


def limiti_pool(indirizzo):
    if make_url(indirizzo).drivername in ("mysql+pymysql", "mariadb+pymysql"):
        return dict(pool_size=8, max_overflow=0, pool_timeout=5)
    return {}
