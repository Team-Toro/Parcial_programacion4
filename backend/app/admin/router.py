from typing import Annotated
from fastapi import APIRouter, Depends
from ..uow.unit_of_work import UnitOfWork, get_uow
from ..core.deps import get_current_active_user
from ..usuarios.model import Usuario
from .schema import DashboardResponse
from .service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin"])
admin_service = AdminService()


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    summary="Dashboard con KPIs del sistema",
    description="Retorna métricas del inventario: totales, stock bajo, valor y top categorías",
)
def get_dashboard(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    _current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return admin_service.get_dashboard(uow)
