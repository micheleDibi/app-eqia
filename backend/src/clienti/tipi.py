import enum

class SessoEnum(str, enum.Enum):
    UOMO = 'uomo'
    DONNA = 'donna'

    @classmethod
    def _missing_(cls, value):
        if value is None or str(value).strip() == '':
            return None
        val_str = str(value).strip().lower()
        if val_str in ['m', 'uomo', 'male']:
            return cls.UOMO
        if val_str in ['f', 'donna', 'female']:
            return cls.DONNA
        return None

class TipoDocumentoEnum(str, enum.Enum):
    CARTA_IDENTITA = "Carta d'identità"
    CARTA_IDENTITA_ALT = "Carta d'Identità"
    PASSAPORTO = 'Passaporto'
    PATENTE = 'Patente'
    ALTRO = 'Altro'

    @classmethod
    def _missing_(cls, value):
        if value is None or str(value).strip() == '':
            return None
        for member in cls:
            if member.value.lower() == str(value).strip().lower():
                return member
        return cls.ALTRO
