"""Validazioni condivise delle scritture anagrafiche."""
import re

from fastapi import HTTPException
from sqlalchemy import or_


def email(valore):
    if valore and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', valore):
        raise ValueError('Inserisci un indirizzo email valido.')
    return valore


def cellulare(valore):
    if not valore:
        return valore
    numero = re.sub(r'[\s().-]', '', valore)
    if numero.startswith('00'):
        numero = '+' + numero[2:]
    if re.fullmatch(r'3\d{8,9}', numero):
        numero = '+39' + numero
    if not re.fullmatch(r'\+[1-9]\d{7,14}', numero):
        raise ValueError('Inserisci un cellulare valido con prefisso internazionale.')
    return numero


def univoci(db, modello, valori, escluso=None):
    colonne = [getattr(modello, nome) == valore for nome, valore in valori.items() if valore]
    if not colonne:
        return
    query = db.query(modello).filter(or_(*colonne))
    chiave = next(iter(modello.__table__.primary_key.columns))
    if escluso is not None:
        query = query.filter(chiave != escluso)
    if query.with_for_update().first() is not None:
        raise HTTPException(409, 'Esiste già un’anagrafica con uno dei dati identificativi o recapiti indicati.')
