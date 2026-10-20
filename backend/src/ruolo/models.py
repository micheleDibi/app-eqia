from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer
from src.database import Base

class Ruolo(Base):
    __tablename__="ruoli"

    ruolo_id:Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True )
    ruolo_codice:Mapped[str]= mapped_column(String, nullable=False)
    ruolo_descrizione:Mapped[str]= mapped_column(String, nullable=False)

    #Relazione
    clienti: Mapped[list["Cliente"]] = relationship(back_populates= "ruolo")