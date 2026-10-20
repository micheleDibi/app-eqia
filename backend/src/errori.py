"""Eccezioni proprie dell'applicazione.

Modulo volutamente senza dipendenze: viene importato da `config`, che a sua
volta e' importato da quasi tutto. Qualsiasi import qui creerebbe cicli.
"""


class ErroreConfigurazione(RuntimeError):
    """La configurazione non permette di avviare l'applicazione.

    Sollevata dal lifespan: uvicorn la traduce in "Application startup failed"
    e in un'uscita con codice diverso da zero. E' il meccanismo con cui l'app
    "si rifiuta di partire" se i pepper mancano o sono i valori d'esempio.
    """


class ErrorePasswordTroppoLunga(ValueError):
    """La password supera i 72 byte, il limite oltre il quale bcrypt tronca.

    Non e' una preferenza: bcrypt ignora i byte successivi *senza segnalarlo*.
    Verificato su bcrypt 4.3.0: `checkpw(b"a"*73, hashpw(b"a"*72))` restituisce
    True, cioe' due password diverse risultano uguali. Troncare significherebbe
    accettare una password piu' debole di quella scelta dall'utente senza
    dirglielo, quindi si rifiuta.
    """

    def __init__(self, byte_ricevuti: int) -> None:
        self.byte_ricevuti = byte_ricevuti
        super().__init__(
            f"La password supera il limite di 72 byte ({byte_ricevuti} byte). "
            "Attenzione: sono byte, non caratteri — le lettere accentate ne "
            "occupano due."
        )


class ErroreTemplateEmail(RuntimeError):
    """Un template di `messaggi_email` non e' utilizzabile.

    Tipicamente: un segnaposto {{...}} senza valore corrispondente. Meglio non
    spedire nulla che spedire una mail con "{{link_reset}}" scritto a video.
    """
