from pydantic import BaseModel, ConfigDict


class EstadoPedidoPublic(BaseModel):
    codigo: str
    descripcion: str
    orden: int
    es_terminal: bool

    model_config = ConfigDict(from_attributes=True)
