"""Registro dei moduli. Ogni modulo conserva i propri endpoint."""
from src.account.routers import router as account
from src.auth.routers import router as auth
from src.edunews24.routers import router as edunews
from src.mfa.accesso import router as mfa_accesso
from src.mfa.gestione import router as mfa_gestione
from src.otp.accesso import router as otp_accesso
from src.otp.contatti import router as contatti
from src.notizie.routers import router as notizie
from src.profilo.routers import router as profilo
from src.ruolo.routers import router as ruoli
from src.clienti.routers import router as clienti
from src.aziende.routers import router as aziende
from src.gestione.opzioni import router as opzioni

ROUTER = (auth, mfa_accesso, mfa_gestione, otp_accesso, contatti, account, profilo,
          ruoli, edunews, notizie, clienti, aziende, opzioni)
