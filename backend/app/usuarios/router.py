"""
Router de autenticación y gestión de usuarios.

HTTP puro: parsear request, validar schema Pydantic, delegar al Service,
serializar response con response_model. No contiene lógica de negocio.

Capa: Router
Conoce a: Service (vía UoW)
NO conoce a: Repository, Model (solo esquemas Pydantic para response_model)

Regla de imports:
    Router → Service → UoW → Repository → Model
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.uow.unit_of_work import UnitOfWork, get_uow
from app.core.deps import get_current_active_user, require_role
from .model import Usuario
from .schema import UsuarioCreate, UsuarioPublic, UsuarioToken
from .service import UsuarioService

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
usuario_service = UsuarioService()


# ─── Registro ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UsuarioPublic, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UsuarioCreate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return usuario_service.register(uow, user_in)


# ─── Login (OAuth2 Password Flow) ────────────────────────────────────────────

@router.post("/token", response_model=UsuarioToken)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return usuario_service.authenticate(uow, form_data.username, form_data.password)


# ─── Rutas protegidas ────────────────────────────────────────────────────────

@router.get("/me", response_model=UsuarioPublic)
def read_me(
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return current_user


@router.get("/privado")
def ruta_privada(
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return {
        "mensaje": f"¡Hola, {current_user.full_name}! Accediste a una ruta privada.",
        "tu_rol": current_user.role,
    }


# ─── Rutas de administración (RBAC) ──────────────────────────────────────────

@router.get("/admin/usuarios", response_model=list[UsuarioPublic])
def list_users(
    _admin: Annotated[Usuario, Depends(require_role(["admin"]))],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return usuario_service.list_all(uow)


@router.post("/admin/usuarios/{user_id}/desactivar", response_model=UsuarioPublic)
def deactivate_user(
    user_id: int,
    _admin: Annotated[Usuario, Depends(require_role(["admin"]))],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return usuario_service.set_disabled(uow, user_id, disabled=True)


@router.post("/admin/usuarios/{user_id}/activar", response_model=UsuarioPublic)
def activate_user(
    user_id: int,
    _admin: Annotated[Usuario, Depends(require_role(["admin"]))],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return usuario_service.set_disabled(uow, user_id, disabled=False)
