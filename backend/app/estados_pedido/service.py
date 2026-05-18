from typing import List
from fastapi import HTTPException, status
from .model import EstadoPedido
from ..uow.unit_of_work import UnitOfWork

TRANSICIONES_VALIDAS: dict[str, list[str]] = {
    "PENDIENTE":  ["CONFIRMADO", "CANCELADO"],
    "CONFIRMADO": ["EN_PREP",    "CANCELADO"],
    "EN_PREP":    ["EN_CAMINO",  "CANCELADO"],
    "EN_CAMINO":  ["ENTREGADO"],
    "ENTREGADO":  [],
    "CANCELADO":  [],
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
        return hacia in TRANSICIONES_VALIDAS.get(desde, [])

    @staticmethod
    def es_terminal(estado: str) -> bool:
        return TRANSICIONES_VALIDAS.get(estado) == []

    @staticmethod
    def get_transiciones_validas(desde: str) -> list[str]:
        return TRANSICIONES_VALIDAS.get(desde, [])
