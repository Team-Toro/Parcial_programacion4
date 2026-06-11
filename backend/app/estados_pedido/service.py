from enum import Enum
from typing import List
from fastapi import HTTPException, status
from .model import EstadoPedido
from ..uow.unit_of_work import UnitOfWork


class EstadoCodigo(str, Enum):
    """Códigos de estado del pedido. Hereda de str para serialización JSON automática."""
    PENDIENTE = "PENDIENTE"
    CONFIRMADO = "CONFIRMADO"
    EN_PREP = "EN_PREP"
    EN_CAMINO = "EN_CAMINO"
    ENTREGADO = "ENTREGADO"
    CANCELADO = "CANCELADO"


TRANSICIONES_VALIDAS: dict[EstadoCodigo, list[EstadoCodigo]] = {
    EstadoCodigo.PENDIENTE:  [EstadoCodigo.CONFIRMADO, EstadoCodigo.CANCELADO],
    EstadoCodigo.CONFIRMADO: [EstadoCodigo.EN_PREP,    EstadoCodigo.CANCELADO],
    EstadoCodigo.EN_PREP:    [EstadoCodigo.EN_CAMINO,  EstadoCodigo.CANCELADO],
    EstadoCodigo.EN_CAMINO:  [EstadoCodigo.ENTREGADO],
    EstadoCodigo.ENTREGADO:  [],
    EstadoCodigo.CANCELADO:  [],
}


class EstadoPedidoService:

    def list_all(self, uow: UnitOfWork) -> List[EstadoPedido]:
        return uow.estados_pedido.list_all()

    def get_by_codigo(self, uow: UnitOfWork, codigo: str) -> EstadoPedido:
        estado = uow.estados_pedido.get_by_codigo(codigo)
        if not estado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Estado de pedido '{codigo}' no encontrado",
            )
        return estado

    @staticmethod
    def es_transicion_valida(desde: str, hacia: str) -> bool:
        try:
            desde_enum = EstadoCodigo(desde)
            hacia_enum = EstadoCodigo(hacia)
        except ValueError:
            return False
        return hacia_enum in TRANSICIONES_VALIDAS.get(desde_enum, [])

    @staticmethod
    def es_terminal(estado: str) -> bool:
        try:
            estado_enum = EstadoCodigo(estado)
        except ValueError:
            return False
        return TRANSICIONES_VALIDAS.get(estado_enum) == []

    @staticmethod
    def get_transiciones_validas(desde: str) -> list[str]:
        try:
            desde_enum = EstadoCodigo(desde)
        except ValueError:
            return []
        return [e.value for e in TRANSICIONES_VALIDAS.get(desde_enum, [])]
