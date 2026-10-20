from typing import Literal
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from src.config import DIR_BACKEND


class ConfigSMS(BaseSettings):
    model_config = SettingsConfigDict(env_file=DIR_BACKEND / ".env", extra="ignore")
    sms_backend: Literal["skebby", "memoria", "file", "disabilitato"] = "disabilitato"
    skebby_user_key: SecretStr = SecretStr("")
    skebby_access_token: SecretStr = SecretStr("")
    skebby_message_type: Literal["GP", "TI"] = "GP"
    skebby_sender: str = ""
    sms_file_dir: str = "var/sms_dev"

    def verifica(self):
        if self.sms_backend == "skebby" and not (self.skebby_user_key.get_secret_value()
                                                and self.skebby_access_token.get_secret_value()):
            raise ValueError("Configurare le credenziali Skebby del backend.")
