from datetime import timedelta
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.mysql import insert
from src.otp.models import Limite
from src.otp.identita import impronta


def prenota(db, contesto, ip, ora):
    cliente, tipo, autore = contesto
    regole = [(f"dest:{cliente}:{tipo}", 5, 60), (f"ip:{ip}", 30, 0),
              (f"autore:{autore}", 30, 0)]
    for nome, massimo, pausa in sorted(regole):
        chiave = impronta("limite:" + nome)
        db.execute(insert(Limite).values(chiave=chiave, finestra=ora, ultimo=ora-timedelta(hours=1), invii=0)
                   .on_duplicate_key_update(chiave=chiave))
        riga = db.scalar(select(Limite).where(Limite.chiave == chiave).with_for_update())
        if ora >= riga.finestra + timedelta(hours=1):
            riga.finestra, riga.invii = ora, 0
        attesa = max(0, int((riga.ultimo + timedelta(seconds=pausa) - ora).total_seconds()))
        if riga.invii >= massimo:
            attesa = max(attesa, int((riga.finestra + timedelta(hours=1) - ora).total_seconds()))
        if attesa > 0:
            db.rollback()
            raise HTTPException(429, "Troppi invii. Attendi prima di richiedere un altro codice.",
                                headers={"Retry-After": str(attesa)})
        riga.ultimo, riga.invii = ora, riga.invii + 1
