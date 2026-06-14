from typing import Annotated

from fastapi import APIRouter, Depends

from app.admin.schema import DashboardStats
from app.admin.service import AdminService
from app.core.deps import require_role
from app.uow.unit_of_work import UnitOfWork, get_uow

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get(
    "/stats",
    response_model=DashboardStats,
    dependencies=[Depends(require_role(["ADMIN"]))],
)
def get_dashboard_stats(uow: Annotated[UnitOfWork, Depends(get_uow)]):
    """Retorna KPIs, gráficos y tablas para el dashboard de administración."""
    return AdminService.get_stats(uow)
