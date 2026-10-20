"""Registrazione dei soli modelli del perimetro Equia."""
from src.auth.models import AuthSessione, PasswordResetRichiesta, PasswordResetToken
from src.auth.limiti_login import LimiteLogin
from src.aziende.models import Azienda
from src.clienti.models import Cliente
from src.mfa.models import AuthMfaUtente, AuthPasskey, AuthTotp
from src.notifiche.models import MessaggioEmail
from src.otp.models import Attivazione, ContattoVerificato, Sfida, Limite
from src.ruolo.models import Ruolo
from src.utenti.models import Utente
