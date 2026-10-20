"""Confini dei nomi degli allegati e persistenza dell'archivio su disco."""
from datetime import datetime
import pytest

from src.notizie.archivio import ArchivioCartella, ConfigArchivio, controlla_percorso
from src.notizie.file import nome_allegato


@pytest.mark.parametrize("originale", ["..", ".", "../..", "  ..  ", "\x00..\n"])
def test_nome_speciale_diventa_allegato(originale):
    nome = nome_allegato(originale, set(), datetime(2026, 10, 20))
    assert nome == "allegato"
    controlla_percorso(f"/Notizie/12/{nome}")


def test_file_resta_disponibile_ricreando_archivio(tmp_path):
    config = ConfigArchivio(ftp_backend="cartella", ftp_dir_cartella=str(tmp_path))
    ArchivioCartella(config).scrivi("/Notizie/12/circolare.pdf", b"%PDF prova")
    assert ArchivioCartella(config).leggi("/Notizie/12/circolare.pdf") == b"%PDF prova"
