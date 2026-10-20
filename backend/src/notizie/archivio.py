"""Dove stanno immagini e allegati delle notizie.

Quattro implementazioni dello stesso protocollo, scelte da FTP_BACKEND:
  ftp           server FTP (connessione non cifrata)
  cartella      una cartella locale (FTP_DIR_CARTELLA), per lo sviluppo
  memoria       un dizionario, per i test; sa simulare un guasto
  disabilitato  nessun archivio: ogni operazione solleva ArchivioNonDisponibile

Le impostazioni si leggono da backend/.env con una classe propria, come gli
SMS (notifiche/config_sms.py): il modulo non cambia la configurazione comune.
In produzione sono ammessi solo ftp e disabilitato.

I percorsi sono sempre assoluti nello stile FTP ("/Notizie/12/a.pdf") e li
costruisce solo cartella_notizia; qui si rifiutano comunque '..', barre
inverse e caratteri di controllo.

Ogni operazione FTP apre e chiude la sua connessione: i caricamenti sono pochi,
e una connessione tenuta aperta fra due richieste verrebbe chiusa dal server
senza avviso.
"""

from __future__ import annotations

import ftplib
import io
import re
from pathlib import Path, PurePosixPath
from typing import Literal, Protocol

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from src.config import DIR_BACKEND, get_impostazioni

# Con la maiuscola: un server FTP distingue maiuscole e minuscole, quindi il
# nome della cartella non va cambiato una volta in uso.
RADICE_NOTIZIE = "/Notizie"


class ConfigArchivio(BaseSettings):
    model_config = SettingsConfigDict(env_file=DIR_BACKEND / ".env", extra="ignore")
    ftp_backend: Literal["ftp", "cartella", "memoria", "disabilitato"] = "disabilitato"
    ftp_host: str = ""
    ftp_porta: int = 21
    ftp_utente: str = ""
    ftp_password: SecretStr = SecretStr("")
    ftp_timeout_secondi: int = 20
    # Prefisso del nome delle cartelle, per ambienti che condividono lo stesso
    # FTP: "/Notizie/<prefisso><id>".
    ftp_prefisso_cartelle: str = ""
    ftp_dir_cartella: str = "var/ftp_dev"

    def verifica(self) -> None:
        if self.ftp_backend == "ftp":
            if not self.ftp_host:
                raise ValueError("FTP_HOST non e' impostato ma FTP_BACKEND=ftp")
            if not 1 <= self.ftp_porta <= 65535:
                raise ValueError(f"FTP_PORTA={self.ftp_porta} non e' una porta valida")
            if self.ftp_timeout_secondi < 1:
                raise ValueError("FTP_TIMEOUT_SECONDI deve essere almeno 1")
        if not re.fullmatch(r"[A-Za-z0-9_-]{0,40}", self.ftp_prefisso_cartelle):
            raise ValueError("FTP_PREFISSO_CARTELLE puo' contenere solo lettere, cifre, '_' e '-' (al massimo 40)")
        if get_impostazioni().ersaf_env == "produzione" and self.ftp_backend in ("cartella", "memoria"):
            raise ValueError(f"in produzione FTP_BACKEND deve essere 'ftp' o 'disabilitato', non '{self.ftp_backend}'")

    @property
    def dir_cartella(self) -> Path:
        percorso = Path(self.ftp_dir_cartella)
        return percorso if percorso.is_absolute() else DIR_BACKEND / percorso


class ArchivioNonDisponibile(RuntimeError):
    """L'archivio e' spento, configurato male o non raggiungibile."""


class FileNonTrovato(FileNotFoundError):
    """Il file chiesto non c'e' nell'archivio."""


def cartella_notizia(notizia_id: int, config: ConfigArchivio | None = None) -> str:
    prefisso = (config or ConfigArchivio()).ftp_prefisso_cartelle
    return f"{RADICE_NOTIZIE}/{prefisso}{int(notizia_id)}"


def controlla_percorso(percorso: str) -> PurePosixPath:
    """Il percorso come PurePosixPath, oppure ValueError se non e' sicuro."""
    if (not percorso.startswith("/") or "\\" in percorso
            or any(ord(c) < 32 or ord(c) == 127 for c in percorso)):
        raise ValueError("percorso non valido")
    # Sul testo e non su PurePosixPath, che toglierebbe da solo "." e "//".
    parti = percorso[1:].split("/")
    if any(p in ("", ".", "..") for p in parti):
        raise ValueError("percorso non valido")
    return PurePosixPath(percorso)


class Archivio(Protocol):
    def scrivi(self, percorso: str, dati: bytes) -> None: ...
    def leggi(self, percorso: str) -> bytes: ...


class ArchivioFTP:
    def __init__(self, config: ConfigArchivio) -> None:
        self.config = config

    def _connetti(self) -> ftplib.FTP:
        c = self.config
        # Il timeout NON e' facoltativo: senza, un server che accetta la
        # connessione e poi tace terrebbe occupato per sempre un thread del pool.
        ftp = ftplib.FTP(timeout=c.ftp_timeout_secondi, encoding="utf-8")
        try:
            ftp.connect(c.ftp_host, c.ftp_porta)
            ftp.login(c.ftp_utente, c.ftp_password.get_secret_value())
            ftp.set_pasv(True)
        except (OSError, ftplib.Error) as errore:
            ftp.close()
            raise ArchivioNonDisponibile(f"FTP non raggiungibile ({type(errore).__name__})") from None
        return ftp

    @staticmethod
    def _assicura_cartella(ftp: ftplib.FTP, cartella: PurePosixPath) -> None:
        # Un livello alla volta: MKD non crea i genitori. "Esiste gia'" e
        # "non posso crearla" rispondono entrambi 550: si distinguono
        # provando a entrarci.
        corrente = PurePosixPath("/")
        for parte in cartella.parts[1:]:
            corrente = corrente / parte
            try:
                ftp.cwd(str(corrente))
            except ftplib.error_perm:
                ftp.mkd(str(corrente))
        ftp.cwd("/")

    def _esegui(self, operazione):
        ftp = self._connetti()
        try:
            return operazione(ftp)
        except ftplib.error_perm as errore:
            if str(errore).startswith("550"):
                raise FileNonTrovato(str(errore)) from None
            raise ArchivioNonDisponibile(f"FTP: operazione rifiutata ({str(errore)[:3]})") from None
        except (OSError, ftplib.Error) as errore:
            raise ArchivioNonDisponibile(f"FTP: operazione non riuscita ({type(errore).__name__})") from None
        finally:
            try:
                ftp.quit()
            except (OSError, ftplib.Error):
                ftp.close()

    def scrivi(self, percorso: str, dati: bytes) -> None:
        file = controlla_percorso(percorso)

        def operazione(ftp):
            self._assicura_cartella(ftp, file.parent)
            ftp.storbinary(f"STOR {file}", io.BytesIO(dati))
        # In scrittura un 550 non e' "file mancante": e' una cartella che non
        # si puo' creare o un file che non si puo' scrivere.
        try:
            self._esegui(operazione)
        except FileNonTrovato:
            raise ArchivioNonDisponibile("FTP: scrittura rifiutata (550)") from None

    def leggi(self, percorso: str) -> bytes:
        file = controlla_percorso(percorso)
        contenuto = io.BytesIO()
        self._esegui(lambda ftp: ftp.retrbinary(f"RETR {file}", contenuto.write))
        return contenuto.getvalue()


class ArchivioCartella:
    """FTP_DIR_CARTELLA fa da radice: "/Notizie/12" diventa <radice>/Notizie/12."""

    def __init__(self, config: ConfigArchivio) -> None:
        self.radice = config.dir_cartella.resolve()

    def _locale(self, percorso: str) -> Path:
        locale = (self.radice / str(controlla_percorso(percorso)).lstrip("/")).resolve()
        if not locale.is_relative_to(self.radice):
            raise ValueError("percorso non valido")
        return locale

    def scrivi(self, percorso: str, dati: bytes) -> None:
        file = self._locale(percorso)
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(dati)

    def leggi(self, percorso: str) -> bytes:
        try:
            return self._locale(percorso).read_bytes()
        except FileNotFoundError:
            raise FileNonTrovato(percorso) from None


class ArchivioMemoria:
    """Per i test: file in memoria, piu' un guasto simulato."""

    def __init__(self) -> None:
        self.file: dict[str, bytes] = {}
        self.guasto = False

    def _controlla(self, percorso: str) -> str:
        if self.guasto:
            raise ArchivioNonDisponibile("guasto simulato")
        return str(controlla_percorso(percorso))

    def scrivi(self, percorso: str, dati: bytes) -> None:
        self.file[self._controlla(percorso)] = bytes(dati)

    def leggi(self, percorso: str) -> bytes:
        percorso = self._controlla(percorso)
        if percorso not in self.file:
            raise FileNonTrovato(percorso)
        return self.file[percorso]

    def svuota(self) -> None:
        self.file.clear()
        self.guasto = False


class ArchivioDisabilitato:
    def __init__(self, motivo: str = "archivio dei file disabilitato (FTP_BACKEND=disabilitato)") -> None:
        self.motivo = motivo

    def _spento(self, *_):
        raise ArchivioNonDisponibile(self.motivo)

    scrivi = leggi = _spento


_memoria = ArchivioMemoria()


def archivio_memoria() -> ArchivioMemoria:
    """L'unica istanza usata quando FTP_BACKEND=memoria."""
    return _memoria


def get_archivio() -> Archivio:
    """Dipendenza FastAPI: risolta per richiesta, quindi i test la sostituiscono.
    Una configurazione non valida spegne l'archivio, con il motivo nel log
    dell'errore, invece di far partire scritture nel posto sbagliato."""
    config = ConfigArchivio()
    try:
        config.verifica()
    except ValueError as errore:
        return ArchivioDisabilitato(str(errore))
    if config.ftp_backend == "ftp":
        return ArchivioFTP(config)
    if config.ftp_backend == "cartella":
        return ArchivioCartella(config)
    if config.ftp_backend == "memoria":
        return _memoria
    return ArchivioDisabilitato()
