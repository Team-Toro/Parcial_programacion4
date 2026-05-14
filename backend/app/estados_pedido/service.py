from typing import List
from fastapi import HTTPException, status
from .model import EstadoPedido
from ..uow.unit_of_work import UnitOfWork


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
