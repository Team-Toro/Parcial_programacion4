from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, Path, Query, status
from fastapi.security import OAuth2PasswordBearer
from .schema import PedidoCreate, PedidoPublic
from .service import PedidoService
from ..uow.unit_of_work import UnitOfWork, get_uow
from ..core.deps import get_current_active_user, require_role
from ..core.security import decode_access_token
from ..usuarios.model import Usuario

oauth2_scheme_pedidos = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])


def get_service() -> PedidoService:
    return PedidoService()


@router.post(
    "/",
    response_model=PedidoPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo pedido",
)
def crear_pedido(
    data: PedidoCreate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PedidoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return service.create(uow, current_user.id, data)


@router.get(
    "/mis-pedidos",
    response_model=List[PedidoPublic],
    summary="Listar mis pedidos",
)
def listar_mis_pedidos(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PedidoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return service.list_user_pedidos(uow, current_user.id, offset, limit)


@router.get(
    "/",
    response_model=List[PedidoPublic],
    summary="Listar todos los pedidos (admin/pedidos)",
    dependencies=[Depends(require_role(["ADMIN", "PEDIDOS"]))],
)
def listar_todos_pedidos(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PedidoService, Depends(get_service)],
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    usuario_id: Annotated[Optional[int], Query(ge=1)] = None,
    estado_codigo: Annotated[Optional[str], Query(max_length=20)] = None,
):
    return service.list_all_pedidos(uow, offset, limit, usuario_id, estado_codigo)


@router.get(
    "/{pedido_id}",
    response_model=PedidoPublic,
    summary="Obtener pedido por ID",
    responses={404: {"description": "Pedido no encontrado"}},
)
def obtener_pedido(
    pedido_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PedidoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
    token: Annotated[str, Depends(oauth2_scheme_pedidos)],
):
    payload = decode_access_token(token)
    roles = payload.get("roles", []) if payload else []
    return service.get_pedido_for_user(uow, pedido_id, current_user.id, roles)
