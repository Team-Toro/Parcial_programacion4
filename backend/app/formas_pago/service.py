from typing import List
from fastapi import HTTPException, status
from .model import FormaPago
from ..uow.unit_of_work import UnitOfWork


class FormaPagoService:

    def list_habilitadas(self, uow: UnitOfWork) -> List[FormaPago]:
        return uow.formas_pago.list_all(only_habilitadas=True)

    def get_by_codigo(self, uow: UnitOfWork, codigo: str) -> FormaPago:
        forma = uow.formas_pago.get_by_codigo(codigo)
        if not forma:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Forma de pago '{codigo}' no encontrada",
            )
        return forma
