"""
Dependencias de autenticación y autorización para inyectar vía Depends().

Flujo de resolución:
    Request
      → oauth2_scheme extrae el Bearer token del header Authorization
      → get_current_user abre un UoW, decodifica el JWT, carga el usuario
      → get_current_active_user verifica que disabled=False
      → require_role([...]) verifica que el rol del usuario esté permitido

Separación semántica de errores HTTP:
    401 = no autenticado (sin token / token inválido / expirado)
    403 = autenticado pero sin permisos (rol insuficiente)

Capa: Core (dependencias transversales)
Conoce a: UoW, Security, Model
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_access_token
from app.uow.unit_of_work import UnitOfWork, get_uow
from app.usuarios.model import Usuario
from app.usuarios.service import UsuarioService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
) -> Usuario:
    """Decodifica el JWT y retorna el Usuario correspondiente."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas o token expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    username: str | None = payload.get("sub")
    if username is None:
        raise credentials_exception

    # busca al service en vez de que uow exponga el usuario
    user = UsuarioService().get_by_username(uow, username)

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: Annotated[Usuario, Depends(get_current_user)],
) -> Usuario:
    """Verifica que el usuario autenticado no esté desactivado."""
    if current_user.disabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cuenta de usuario desactivada",
        )
    return current_user


def require_role(allowed_roles: list[str]):
    """
    Factory de dependencias para control de acceso basado en roles (RBAC).

    Uso:
        @router.get("/admin/...", dependencies=[Depends(require_role(["admin"]))])
    """

    async def role_checker(
        current_user: Annotated[Usuario, Depends(get_current_active_user)],
    ) -> Usuario:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Permisos insuficientes. Tu rol es '{current_user.role}'. "
                    f"Se requiere uno de: {allowed_roles}"
                ),
            )
        return current_user

    return role_checker
