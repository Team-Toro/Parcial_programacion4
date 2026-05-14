from typing import Annotated, List
from fastapi import APIRouter, Depends, Path
from .schema import EstadoPedidoPublic
from .service import EstadoPedidoService
from ..uow.unit_of_work import UnitOfWork, get_uow
from ..core.deps import get_current_active_user
from ..usuarios.model import Usuario

router = APIRouter(prefix="/estados-pedido", tags=["Estados de Pedido"])


def get_service() -> EstadoPedidoService:
    return EstadoPedidoService()


@router.get(
    "/",
    response_model=List[EstadoPedidoPublic],
    summary="Listar estados de pedido",
)
def listar_estados_pedido(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[EstadoPedidoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return service.list_all(uow)


@router.get(
    "/{codigo}",
    response_model=EstadoPedidoPublic,
    summary="Obtener estado de pedido por código",
    responses={404: {"description": "Estado de pedido no encontrado"}},
)
def obtener_estado_pedido(
    codigo: Annotated[str, Path(min_length=1, max_length=20)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[EstadoPedidoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return service.get_by_codigo(uow, codigo)
