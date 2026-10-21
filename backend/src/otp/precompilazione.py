"""Codice di accesso dimostrativo, esclusivamente nel collaudo senza SMTP."""
from src.ambiente_staging import verifica_staging
from src.config import get_impostazioni
from src.otp.identita import VERIFICA_EMAIL


def codice_per_collaudo(tipo, codice):
    imp = get_impostazioni()
    if (tipo not in ("login", VERIFICA_EMAIL) or imp.ersaf_env == "produzione"
            or imp.email_backend != "file"
            or any(v.strip() for v in (imp.smtp_host, imp.smtp_user, imp.smtp_password))):
        return {}
    try:
        verifica_staging(imp)
    except (ValueError, OSError):
        return {}
    return {"codice_precompilato": codice}
