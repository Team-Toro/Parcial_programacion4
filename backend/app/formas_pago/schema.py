from pydantic import BaseModel, ConfigDict


class FormaPagoPublic(BaseModel):
    codigo: str
    descripcion: str
    habilitado: bool

    model_config = ConfigDict(from_attributes=True)
