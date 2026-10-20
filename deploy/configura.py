"""Configurazione iniziale remota; conserva i segreti dei rilasci successivi."""
import json
import os
from pathlib import Path
import secrets
import subprocess

CONFIG = json.loads(Path(__file__).with_name("staging.json").read_text(encoding="utf-8"))


def scrivi(percorso, contenuto, modo=0o600):
    with percorso.open("x", encoding="utf-8") as file:
        file.write(contenuto)
    percorso.chmod(modo)


def ambiente(shared):
    nomi = ("db.env", "api.env", "client.cnf")
    presenti = [(shared / nome).exists() for nome in nomi]
    if all(presenti):
        return
    if any(presenti):
        raise SystemExit("Configurazione incompleta: completare i file esistenti senza rigenerare i segreti.")
    password, root = secrets.token_hex(32), secrets.token_hex(32)
    schema, utente = CONFIG["databaseName"], CONFIG["databaseUser"]
    scrivi(shared / "db.env", f"MARIADB_DATABASE={schema}\nMARIADB_USER={utente}\n"
           f"MARIADB_PASSWORD={password}\nMARIADB_ROOT_PASSWORD={root}\nTZ=Europe/Rome\n")
    scrivi(shared / "client.cnf", f"[client]\nuser=root\npassword={root}\n")
    valori = {
        "ERSAF_ENV": "sviluppo", "DATABASE_URL": f"mysql+pymysql://{utente}:{password}@db:3306/{schema}?charset=utf8mb4",
        "DATABASE_TRASPORTO": "verify-full", "DATABASE_CA_FILE": "/run/secrets/db-ca.crt",
        "PASSWORD_RESET_TOKEN_PEPPER": secrets.token_hex(48), "SESSION_TOKEN_PEPPER": secrets.token_hex(48),
        "TOTP_CHIAVE": secrets.token_hex(48), "FRONTEND_BASE_URL": f'https://{CONFIG["domain"]}',
        "CORS_ORIGINS": f'https://{CONFIG["domain"]}', "WEBAUTHN_RP_ID": CONFIG["domain"],
        "WEBAUTHN_ORIGINI": f'https://{CONFIG["domain"]}', "WEBAUTHN_NOME": "Equia",
        "EMAIL_BACKEND": "file", "EMAIL_FILE_DIR": "var/email",
        "SMS_BACKEND": "file", "SMS_FILE_DIR": "var/sms",
        "EDUNEWS24_BACKEND": "disabilitato", "LOG_FILE": "", "TZ": "Europe/Rome",
    }
    scrivi(shared / "api.env", "".join(f"{chiave}={valore}\n" for chiave, valore in valori.items()))


def openssl(*argomenti):
    subprocess.run(["openssl", *argomenti], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def certificati(shared):
    tls = shared / "db-tls"
    tls.mkdir(mode=0o750, exist_ok=True)
    tls.chmod(0o750)
    os.chown(tls, 0, 999)
    if (tls / "server.cnf").exists():
        for nome in ("ca.crt", "server.crt", "server.key"):
            if not (tls / nome).is_file():
                raise SystemExit("Configurazione TLS incompleta.")
        return
    if any(tls.iterdir()):
        raise SystemExit("Materiale TLS parziale: verificare prima di ripetere l'installazione.")
    ca_key = shared / "db-ca.key"
    openssl("req", "-x509", "-newkey", "rsa:3072", "-nodes", "-days", "3650",
            "-subj", "/CN=Equia staging database CA", "-keyout", str(ca_key), "-out", str(tls / "ca.crt"))
    openssl("req", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=db",
            "-keyout", str(tls / "server.key"), "-out", str(tls / "server.csr"))
    scrivi(tls / "extensions.cnf", "subjectAltName=DNS:db\nextendedKeyUsage=serverAuth\n")
    openssl("x509", "-req", "-in", str(tls / "server.csr"), "-CA", str(tls / "ca.crt"),
            "-CAkey", str(ca_key), "-CAcreateserial", "-days", "730", "-sha256",
            "-extfile", str(tls / "extensions.cnf"), "-out", str(tls / "server.crt"))
    scrivi(tls / "server.cnf", "[mariadb]\nssl-ca=/run/secrets/db/ca.crt\n"
           "ssl-cert=/run/secrets/db/server.crt\nssl-key=/run/secrets/db/server.key\nrequire-secure-transport=ON\n", 0o644)
    os.chown(tls, 0, 999)
    for percorso in tls.iterdir():
        percorso.chmod(0o640 if percorso.name == "server.key" else 0o644)
        os.chown(percorso, 0, 999)
    ca_key.chmod(0o600)


def firewall():
    script = Path("/usr/local/sbin") / f'{CONFIG["project"]}-firewall'
    template = Path(__file__).with_name("firewall.sh.template").read_text(encoding="utf-8")
    for chiave in ("serverIp", "proxyIp", "webPort"):
        template = template.replace(f"@{chiave}@", str(CONFIG[chiave]))
    script.write_text(template, encoding="utf-8")
    script.chmod(0o750)
    unita = f'{CONFIG["project"]}-firewall.service'
    Path("/etc/systemd/system", unita).write_text(
        "[Unit]\nDescription=Firewall staging Equia\nRequires=docker.service\nAfter=docker.service\n"
        f"PartOf=docker.service\n[Service]\nType=oneshot\nExecStart={script}\nRemainAfterExit=yes\n"
        "[Install]\nWantedBy=multi-user.target\n", encoding="utf-8")
    subprocess.run(["systemctl", "daemon-reload"], check=True)
    subprocess.run(["systemctl", "enable", unita], check=True)
    subprocess.run(["systemctl", "restart", unita], check=True)


def main():
    base = Path(CONFIG["base"])
    if os.geteuid() != 0 or base.resolve() != Path("/srv/ersaf-eqia"):
        raise SystemExit("Configurazione ammessa soltanto sulla destinazione dedicata.")
    if (base / ".progetto").read_text().strip() != CONFIG["project"]:
        raise SystemExit("Identità dell'installazione non corrispondente.")
    os.umask(0o077)
    ambiente(base / "shared")
    certificati(base / "shared")
    for nome in ("email", "sms", "accesso", "notizie"):
        percorso = base / "state" / nome
        percorso.mkdir(mode=0o700, exist_ok=True)
        os.chown(percorso, 10001, 10001)
    firewall()
    print("Configurazione Equia pronta; segreti esistenti conservati.")


if __name__ == "__main__":
    main()
