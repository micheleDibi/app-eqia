from pydantic import BaseModel, Field


class RichiestaSfida(BaseModel):
    sfida: str = Field(pattern=r"^[A-Za-z0-9_-]{43}$")


class ConfermaSfida(RichiestaSfida):
    codice: str = Field(pattern=r"^[0-9]{6}$")
