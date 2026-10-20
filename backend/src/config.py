"""Configurazione dell'applicazione, letta da .env.

DUE STRATI, ed e' la scelta centrale di questo modulo.

  1. `Impostazioni` e' PERMISSIVA: nessun campo obbligatorio, nessun validator
     che possa sollevare. Costruirla non fallisce mai. Serve perche'
     `src.database` chiama `create_engine` a import-time, quindi qualunque
     eccezione qui renderebbe impossibile perfino la raccolta dei test.

  2. `verifica_configurazione()` e' SEVERA e viene chiamata dal lifespan di
     FastAPI. Se i pepper mancano, sono corti o sono ancora i valori
     d'esempio, solleva e uvicorn esce con "Application startup failed":
     l'applicazione si rifiuta di partire, come richiede il requisito.

Perche' non un solo strato: mettendo i validator sui campi, il ValidationError
scatterebbe al primo `import src.database` e il fallimento non sarebbe
testabile — il test dovrebbe importare il modulo che esplode per verificare
che esploda.
"""
from __future__ import annotations
import re
from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit
from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from src.errori import ErroreConfigurazione
DIR_BACKEND = Path(__file__).resolve().parents[1]
load_dotenv(DIR_BACKEND / '.env')
PREFISSO_ESEMPIO = 'CAMBIAMI'
LUNGHEZZA_MINIMA_PEPPER_BYTE = 32

class Impostazioni(BaseSettings):
    """Tutti i valori di configurazione. Nessuno e' obbligatorio a questo
    livello: l'obbligatorieta' e' applicata da verifica_configurazione()."""
    model_config = SettingsConfigDict(env_file=DIR_BACKEND / '.env', env_file_encoding='utf-8', extra='ignore', case_sensitive=False)
    ersaf_env: Literal['sviluppo', 'test', 'produzione'] = 'sviluppo'
    database_url: str = ''
    database_trasporto: str = 'verify-full'
    database_ca_file: str = ''
    password_reset_token_pepper: str = ''
    session_token_pepper: str = ''
    totp_chiave: str = ''
    password_reset_token_ttl_minutes: int = 60
    password_reset_rate_limit_per_hour: int = 5
    password_reset_budget_ms: int = 900
    frontend_base_url: str = 'http://localhost:5180'
    session_inattivita_giorni: int = 14
    session_durata_massima_giorni: int = 90
    login_finestra_secondi: int = 900
    login_tentativi_account: int = 5
    login_tentativi_ip: int = 50
    login_attesa_massima_secondi: int = 60
    bcrypt_cost: int = 12
    password_min_length: int = 8
    webauthn_rp_id: str = 'localhost'
    webauthn_origini: str = 'http://localhost:5180'
    webauthn_nome: str = 'Equia'
    cors_origins: str = 'http://localhost:5180'
    log_level: str = 'INFO'
    log_file: str = 'logs/app.log'
    email_backend: Literal['smtp', 'file', 'console', 'memoria'] = 'file'
    email_file_dir: str = 'var/email_dev'
    smtp_host: str = ''
    smtp_port: int = 587
    smtp_user: str = ''
    smtp_password: str = ''
    smtp_from: str = 'Equia <noreply@example.org>'
    smtp_tls: Literal['starttls', 'ssl', 'nessuno'] = 'starttls'
    smtp_timeout_seconds: int = 10
    otp_hostname: str = ''
    edunews24_backend: Literal['http', 'memoria', 'disabilitato'] = 'http'
    edunews24_url_base: str = 'https://edunews24.it/api/v1'
    edunews24_contatto: str = 'info@ersaf.it'
    edunews24_host_media: str = 'audios234567.s3.eu-north-1.amazonaws.com'
    edunews24_timeout_connessione_secondi: int = 3
    edunews24_timeout_lettura_secondi: int = 5
    edunews24_timeout_totale_secondi: int = 8
    edunews24_ttl_ripiego_secondi: int = 300
    edunews24_stantio_massimo_secondi: int = 86400
    edunews24_pausa_ripiego_secondi: int = 30
    edunews24_richieste_al_minuto: int = 30

    @field_validator('frontend_base_url')
    @classmethod
    def _senza_slash_finale(cls, v: str) -> str:
        return v.rstrip('/')

    @property
    def lista_cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(',') if o.strip()]

    @property
    def lista_webauthn_origini(self) -> list[str]:
        return [o.strip().rstrip('/') for o in self.webauthn_origini.split(',') if o.strip()]

    @property
    def lista_edunews24_host_media(self) -> list[str]:
        return list(dict.fromkeys((h.strip().lower() for h in self.edunews24_host_media.split(',') if h.strip())))

    def _percorso(self, valore: str) -> Path:
        p = Path(valore)
        return p if p.is_absolute() else DIR_BACKEND / p

    @property
    def dir_email_file(self) -> Path:
        return self._percorso(self.email_file_dir)

    @property
    def percorso_log(self) -> Path | None:
        return self._percorso(self.log_file) if self.log_file else None

@lru_cache(maxsize=1)
def get_impostazioni() -> Impostazioni:
    """Istanza unica, costruita pigramente alla prima chiamata.

    E' `lru_cache` e non una costante di modulo proprio per esporre
    `get_impostazioni.cache_clear()`: e' cio' che rende testabile il rifiuto
    di avviarsi, permettendo a un test di cambiare l'ambiente e ricostruire.
    """
    return Impostazioni()

def _problemi_pepper(nome: str, valore: str) -> list[str]:
    if not valore:
        return [f"{nome} non e' impostata"]
    if valore.startswith(PREFISSO_ESEMPIO):
        return [f"{nome} e' ancora il valore d'esempio di .env.example"]
    if valore != valore.strip():
        return [f'{nome} ha spazi iniziali o finali']
    lunghezza = len(valore.encode('utf-8'))
    if lunghezza < LUNGHEZZA_MINIMA_PEPPER_BYTE:
        return [f"{nome} e' lunga {lunghezza} byte, ne servono almeno {LUNGHEZZA_MINIMA_PEPPER_BYTE}"]
    return []

def verifica_configurazione(imp: Impostazioni | None=None) -> None:
    """Solleva ErroreConfigurazione elencando TUTTI i problemi in una volta.

    Accumula invece di fermarsi al primo: chi sta configurando l'ambiente per
    la prima volta deve vedere l'elenco completo, non scoprirne uno per riavvio.
    """
    imp = imp or get_impostazioni()
    problemi: list[str] = []
    problemi += _problemi_pepper('PASSWORD_RESET_TOKEN_PEPPER', imp.password_reset_token_pepper)
    problemi += _problemi_pepper('SESSION_TOKEN_PEPPER', imp.session_token_pepper)
    problemi += _problemi_pepper('TOTP_CHIAVE', imp.totp_chiave)
    if imp.totp_chiave and imp.totp_chiave in (imp.password_reset_token_pepper, imp.session_token_pepper):
        problemi.append('TOTP_CHIAVE deve essere diversa dai pepper: cifra i segreti degli authenticator, non firma token')
    if imp.password_reset_token_pepper and imp.password_reset_token_pepper == imp.session_token_pepper:
        problemi.append("PASSWORD_RESET_TOKEN_PEPPER e SESSION_TOKEN_PEPPER devono essere diverse: con lo stesso valore l'impronta di un token di reset e quella di un token di sessione coinciderebbero")
    if not imp.database_url:
        problemi.append("DATABASE_URL non e' impostata")
    elif 'root:1234@' in imp.database_url:
        problemi.append('DATABASE_URL usa le credenziali di default root:1234 che erano hardcoded nel codice')
    if not 4 <= imp.bcrypt_cost <= 16:
        problemi.append(f"BCRYPT_COST={imp.bcrypt_cost} fuori dall'intervallo 4..16")
    if imp.password_min_length < 8:
        problemi.append(f"PASSWORD_MIN_LENGTH={imp.password_min_length}: il minimo e' 8, che e' anche il minimo assoluto del NIST SP 800-63B. La stessa raccomandazione ne consiglia 12 o piu' per le utenze amministrative: alzarlo qui e' una scelta che si puo' fare in .env, abbassarlo sotto 8 no.")
    if imp.password_reset_token_ttl_minutes < 1:
        problemi.append('PASSWORD_RESET_TOKEN_TTL_MINUTES deve essere almeno 1')
    if imp.password_reset_rate_limit_per_hour < 1:
        problemi.append('PASSWORD_RESET_RATE_LIMIT_PER_HOUR deve essere almeno 1')
    if imp.session_inattivita_giorni < 1:
        problemi.append('SESSION_INATTIVITA_GIORNI deve essere almeno 1')
    if imp.session_durata_massima_giorni < imp.session_inattivita_giorni:
        problemi.append("SESSION_DURATA_MASSIMA_GIORNI non puo' essere inferiore a SESSION_INATTIVITA_GIORNI: il tetto assoluto scatterebbe prima della finestra di inattivita'")
    for nome in ('login_finestra_secondi', 'login_tentativi_account', 'login_tentativi_ip', 'login_attesa_massima_secondi'):
        if getattr(imp, nome) < 1:
            problemi.append(f'{nome.upper()} deve essere almeno 1')
    if imp.login_attesa_massima_secondi > imp.login_finestra_secondi:
        problemi.append("LOGIN_ATTESA_MASSIMA_SECONDI non puo' superare la finestra")
    if '*' in imp.lista_cors_origins:
        problemi.append('CORS_ORIGINS deve elencare origini esplicite per le sessioni cookie')
    rp_id = imp.webauthn_rp_id.strip().lower()
    if not rp_id or '/' in rp_id or ':' in rp_id:
        problemi.append("WEBAUTHN_RP_ID deve essere un nome di dominio, senza schema ne' porta")
    if not imp.lista_webauthn_origini:
        problemi.append("WEBAUTHN_ORIGINI deve elencare almeno un'origine")
    for origine in imp.lista_webauthn_origini:
        parti = urlsplit(origine)
        host = (parti.hostname or '').lower()
        if parti.scheme not in ('http', 'https') or not host:
            problemi.append(f"WEBAUTHN_ORIGINI: '{origine}' non e' un'origine http(s)")
        elif rp_id and host != rp_id and (not host.endswith('.' + rp_id)):
            problemi.append(f"WEBAUTHN_ORIGINI: l'host di '{origine}' non appartiene al dominio WEBAUTHN_RP_ID={imp.webauthn_rp_id}: le passkey non funzionerebbero")
        elif parti.scheme == 'http' and host not in {'localhost', '127.0.0.1', '::1'}:
            problemi.append('WEBAUTHN_ORIGINI: le passkey richiedono HTTPS fuori da localhost')
    frontend = urlsplit(imp.frontend_base_url)
    if frontend.scheme == 'http' and frontend.hostname not in {'localhost', '127.0.0.1', '::1'}:
        problemi.append("Le sessioni cookie richiedono HTTPS; HTTP e' ammesso solo su loopback")
    if not imp.frontend_base_url.startswith(('http://', 'https://')):
        problemi.append('FRONTEND_BASE_URL deve iniziare con http:// o https://: finisce nel link della mail di reset')
    if imp.ersaf_env == 'produzione':
        if imp.email_backend != 'smtp':
            problemi.append(f"in produzione EMAIL_BACKEND deve essere 'smtp', non '{imp.email_backend}'")
        if imp.email_backend == 'smtp' and (not imp.smtp_host):
            problemi.append("SMTP_HOST non e' impostato ma EMAIL_BACKEND=smtp")
        if imp.frontend_base_url.startswith('http://'):
            problemi.append('in produzione FRONTEND_BASE_URL deve essere https')
        if '*' in imp.cors_origins:
            problemi.append("in produzione CORS_ORIGINS non puo' contenere '*'")
        if imp.edunews24_backend == 'memoria':
            problemi.append("in produzione EDUNEWS24_BACKEND non puo' essere 'memoria'")
    from src.edunews24.verifica import problemi_configurazione
    problemi += problemi_configurazione(imp)
    if problemi:
        raise ErroreConfigurazione("Configurazione non valida, l'applicazione non puo' partire:\n  - " + '\n  - '.join(problemi) + '\n\nCopia backend/.env.example in backend/.env e completalo. I due pepper si generano con:\n  python3 -c "import secrets; print(secrets.token_urlsafe(48))"')
