from typing import Annotated, List
from fastapi import APIRouter, Depends, Path
from .schema import FormaPagoPublic
from .service import FormaPagoService
from ..uow.unit_of_work import UnitOfWork, get_uow
from ..core.deps import get_current_active_user
from ..usuarios.model import Usuario

router = APIRouter(prefix="/formas-pago", tags=["Formas de Pago"])


def get_service() -> FormaPagoService:
    return FormaPagoService()


@router.get(
    "/",
    response_model=List[FormaPagoPublic],
    summary="Listar formas de pago habilitadas",
)
def listar_formas_pago(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[FormaPagoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return service.list_habilitadas(uow)


@router.get(
    "/{codigo}",
    response_model=FormaPagoPublic,
    summary="Obtener forma de pago por código",
    responses={404: {"description": "Forma de pago no encontrada"}},
)
def obtener_forma_pago(
    codigo: Annotated[str, Path(min_length=1, max_length=20)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[FormaPagoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return service.get_by_codigo(uow, codigo)
