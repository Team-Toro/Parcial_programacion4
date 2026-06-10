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

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.config import settings
from app.core.limiter import limiter
from app.uow.unit_of_work import UnitOfWork, get_uow
from app.core.deps import get_current_active_user, require_role
from .model import Usuario
from .schema import RefreshTokenRequest, UsuarioCreate, UsuarioPublic, UsuarioRolesUpdate, UsuarioToken
from .service import UsuarioService

router = APIRouter(prefix="/auth", tags=["auth"])
usuario_service = UsuarioService()


# ─── Registro ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UsuarioPublic, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/15minute")
def register(
    request: Request,
    user_in: UsuarioCreate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    usuario = usuario_service.register(uow, user_in)
    return usuario_service.to_public(uow, usuario)


# ─── Login (OAuth2 Password Flow) ────────────────────────────────────────────

@router.post("/token", response_model=UsuarioToken)
@limiter.limit("5/15minute")
def login(
    request: Request,
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    result = usuario_service.authenticate(uow, form_data.username, form_data.password)
    # secure=False en dev (localhost sin HTTPS); en prod cambiar a True
    response.set_cookie(
        key="access_token",
        value=result.access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=result.refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/v1/auth",
    )
    return result


# ─── Rutas protegidas ────────────────────────────────────────────────────────

@router.get("/me", response_model=UsuarioPublic)
def read_me(
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return usuario_service.to_public(uow, current_user)


@router.get("/privado")
def ruta_privada(
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return {
        "mensaje": f"¡Hola, {current_user.first_name} {current_user.last_name}! Accediste a una ruta privada.",
    }


# ─── Rutas de administración (RBAC) ──────────────────────────────────────────

@router.get("/admin/usuarios", response_model=list[UsuarioPublic])
def list_users(
    _admin: Annotated[Usuario, Depends(require_role(["ADMIN"]))],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    q: Annotated[str | None, Query(min_length=1, description="Búsqueda (case-insensitive) por nombre/apellido/email")] = None,
    role: Annotated[str | None, Query(pattern="^(ADMIN|CLIENTE|STOCK|PEDIDOS)$", description="Filtrar por rol")] = None,
    disabled: Annotated[bool | None, Query(description="Filtrar por estado de cuenta")] = None,
    sort: Annotated[str | None, Query(pattern="^(id|first_name|last_name|email)$", description="Campo de orden")] = None,
    order: Annotated[str, Query(pattern="^(asc|desc)$", description="Dirección de orden")] = "asc",
):
    usuarios = usuario_service.list_users(
        uow=uow,
        offset=offset,
        limit=limit,
        q=q,
        role=role,
        disabled=disabled,
        sort=sort,
        order=order,
    )
    return [usuario_service.to_public(uow, usuario) for usuario in usuarios]


@router.post("/admin/usuarios/{user_id}/desactivar", response_model=UsuarioPublic)
def deactivate_user(
    user_id: int,
    _admin: Annotated[Usuario, Depends(require_role(["ADMIN"]))],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    usuario = usuario_service.set_disabled(uow, user_id, disabled=True)
    return usuario_service.to_public(uow, usuario)


@router.post("/admin/usuarios/{user_id}/activar", response_model=UsuarioPublic)
def activate_user(
    user_id: int,
    _admin: Annotated[Usuario, Depends(require_role(["ADMIN"]))],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    usuario = usuario_service.set_disabled(uow, user_id, disabled=False)
    usuario_service.ensure_default_role_on_activate(uow, usuario)
    return usuario_service.to_public(uow, usuario)


@router.put("/admin/usuarios/{user_id}/roles", response_model=UsuarioPublic)
def update_roles(
    user_id: int,
    payload: UsuarioRolesUpdate,
    _admin: Annotated[Usuario, Depends(require_role(["ADMIN"]))],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    usuario = usuario_service.set_roles(uow, user_id, payload.roles)
    return usuario_service.to_public(uow, usuario)


# ─── Refresh Token ────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=UsuarioToken)
def refresh_token(
    request: Request,
    response: Response,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    body: Optional[RefreshTokenRequest] = None,
):
    token = request.cookies.get("refresh_token")
    if not token and body:
        token = body.refresh_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided",
        )
    result = usuario_service.refresh(uow, token)
    response.set_cookie(
        key="access_token",
        value=result.access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=result.refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/v1/auth",
    )
    return result


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    token = request.cookies.get("refresh_token")
    if token:
        usuario_service.logout(uow, token)
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/v1/auth")
    return {"message": "Sesión cerrada"}
