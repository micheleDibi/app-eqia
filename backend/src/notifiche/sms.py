import json
import secrets
from pathlib import Path
import httpx
from src.config import DIR_BACKEND, get_impostazioni
from src.notifiche.config_sms import ConfigSMS

API_SKEBBY = "https://api.skebby.it/API/v1.0/REST"


class BackendSkebby:
    def __init__(self, config=None, trasporto=None):
        self.config = config or ConfigSMS()
        self.trasporto = trasporto

    def invia(self, destinatario, testo):
        self.config.verifica()
        headers = {"user_key": self.config.skebby_user_key.get_secret_value(),
                   "Access_token": self.config.skebby_access_token.get_secret_value()}
        payload = {"message_type": self.config.skebby_message_type, "message": testo,
                   "recipient": [destinatario], "sender": self.config.skebby_sender or None,
                   "returnCredits": False}
        try:
            with httpx.Client(timeout=10, follow_redirects=False, transport=self.trasporto) as client:
                risposta = client.post(API_SKEBBY + "/sms", headers=headers, json=payload)
            if risposta.status_code not in (200, 201):
                raise ValueError("invio rifiutato")
            dati = risposta.json()
            if dati.get("result") != "OK" or not dati.get("order_id") or dati.get("total_sent") != 1:
                raise ValueError("invio non confermato")
        except Exception:
            # Mai propagare body, URL o headers del provider nei log/risposte.
            raise RuntimeError("Invio SMS non confermato dal servizio. Riprova più tardi.") from None


class BackendMemoriaSMS:
    def __init__(self):
        self.inviati = []
        self.errore = False

    def invia(self, destinatario, testo):
        if self.errore:
            raise RuntimeError("Invio SMS non disponibile.")
        self.inviati.append((destinatario, testo))


class BackendFileSMS:
    def invia(self, destinatario, testo):
        directory = DIR_BACKEND / ConfigSMS().sms_file_dir
        directory.mkdir(parents=True, exist_ok=True)
        (directory / (secrets.token_hex(12) + ".json")).write_text(
            json.dumps({"destinatario": destinatario, "testo": testo}), encoding="utf-8")


memoria_sms = BackendMemoriaSMS()


def get_sms():
    config = ConfigSMS()
    config.verifica()
    if config.sms_backend == "skebby":
        return BackendSkebby(config)
    if get_impostazioni().ersaf_env == "produzione":
        raise RuntimeError("Backend SMS reale richiesto in produzione.")
    if config.sms_backend == "memoria":
        return memoria_sms
    if config.sms_backend == "file":
        return BackendFileSMS()
    raise RuntimeError("Invio SMS non configurato.")
