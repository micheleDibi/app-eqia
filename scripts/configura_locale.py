"""Genera esclusivamente configurazioni locali nuove; non sovrascrive file."""
from pathlib import Path
import secrets

ROOT = Path(__file__).resolve().parents[1]


def main():
    destinazioni = [ROOT / ".env", ROOT / "backend/.env"]
    if any(p.exists() for p in destinazioni):
        raise SystemExit("Configurazione locale già presente: nessun file modificato.")
    password, root_password = secrets.token_urlsafe(24), secrets.token_urlsafe(24)
    contenuti = [
        f"EQIA_DB_PASSWORD={password}\nEQIA_DB_ROOT_PASSWORD={root_password}\n",
        (ROOT / "backend/.env.example").read_text(encoding="utf-8")
        .replace("CAMBIAMI_DB_PASSWORD", password)
        .replace("CAMBIAMI_RESET", secrets.token_urlsafe(48))
        .replace("CAMBIAMI_SESSIONE", secrets.token_urlsafe(48))
        .replace("CAMBIAMI_TOTP", secrets.token_urlsafe(48)),
    ]
    for percorso, contenuto in zip(destinazioni, contenuti):
        with percorso.open("x", encoding="utf-8") as f:
            f.write(contenuto)
    print("Configurazioni locali create. Nessun servizio remoto configurato.")


if __name__ == "__main__":
    main()
