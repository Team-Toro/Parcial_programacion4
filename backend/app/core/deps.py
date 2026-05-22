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

from fastapi import Depends, HTTPException, status, Request, Query
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_access_token
from app.uow.unit_of_work import UnitOfWork, get_uow
from app.usuarios.model import Usuario
from app.usuarios.service import UsuarioService


class OAuth2PasswordBearerWithCookie(OAuth2PasswordBearer):
    """
    Codigo viene del profe.
    es el pase a guardar el token en cookie.
    """

    async def __call__(self, request: Request) -> str | None:
        # 1. Obtener el token EXCLUSIVAMENTE de la cookie (HttpOnly)
        token = request.cookies.get("access_token")

        # 2. El soporte para el header Authorization fue deshabilitado.
        # ¿Por qué? Para maximizar la seguridad y forzar el uso de cookies HttpOnly.
        # Las cookies HttpOnly no pueden ser leídas por JavaScript (mitigando ataques XSS).
        # Si permitiéramos usar el token vía header, el frontend tendría que manipular
        # el token en texto plano, arruinando el propósito de la cookie HttpOnly.
        #
        # if not token:
        #     authorization = request.headers.get("Authorization")
        #     if authorization and authorization.startswith("Bearer "):
        #         token = authorization.split(" ")[1]

        if not token:
            if self.auto_error:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="No autenticado",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            else:
                return None
        return token


# Define el esquema OAuth2 que extrae el token de la cookie (o header)
oauth2_scheme = OAuth2PasswordBearerWithCookie(tokenUrl="/api/v1/auth/token")


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

    email: str | None = payload.get("sub")
    if email is None:
        raise credentials_exception

    # busca al service en vez de que uow exponga el usuario
    user = UsuarioService().get_by_username(uow, email)

    if user is None:
        raise credentials_exception

    # Populate roles from repository/service so downstream dependencies
    # (authorization) can rely on a single source of truth (the DB),
    # instead of re-decoding the token.
    # object.__setattr__ bypasses Pydantic's __setattr__ — Usuario es un modelo
    # SQLModel table=True y no tiene 'roles' declarado como columna. El atributo
    # queda en __dict__ de la instancia y es accesible con getattr normalmente.
    try:
        object.__setattr__(user, "roles", UsuarioService().get_roles(uow, user.id))
    except Exception:
        object.__setattr__(user, "roles", [])

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


def require_role(allowed_roles: list[str], match: str = "any"):
    """
    Factory de dependencias para control de acceso basado en roles (RBAC).

    Uso:
        @router.get("/admin/...", dependencies=[Depends(require_role(["ADMIN"]))])
    """

    allowed_set = {r.lower() for r in allowed_roles}

    async def role_checker(
        current_user: Annotated[Usuario, Depends(get_current_active_user)],
    ) -> Usuario:
        user_roles = getattr(current_user, "roles", None) or []

        if not user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=("Permisos insuficientes. Usuario sin roles asignados."),
            )

        user_set = {r.lower() for r in user_roles}
        if match == "all":
            ok = allowed_set.issubset(user_set)
        else:
            ok = bool(user_set & allowed_set)

        if not ok:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Permisos insuficientes. Tu rol(es) {user_roles} "
                    f"no contienen ninguno de: {allowed_roles}"
                ),
            )

        return current_user

    return role_checker


def require_role_if_include_deleted(allowed_roles: list[str], match: str = "any"):
    """
    Requiere rol solo cuando include_deleted=true.

    Uso:
        @router.get("/", dependencies=[Depends(require_role_if_include_deleted(["ADMIN"]))])
    """

    allowed_set = {r.lower() for r in allowed_roles}

    async def role_checker(
        current_user: Annotated[Usuario, Depends(get_current_active_user)],
        include_deleted: Annotated[bool, Query()] = False,
    ) -> Usuario:
        if not include_deleted:
            return current_user

        user_roles = getattr(current_user, "roles", None) or []
        if not user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=("Permisos insuficientes. Usuario sin roles asignados."),
            )

        user_set = {r.lower() for r in user_roles}
        if match == "all":
            ok = allowed_set.issubset(user_set)
        else:
            ok = bool(user_set & allowed_set)

        if not ok:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Permisos insuficientes. Tu rol(es) {user_roles} "
                    f"no contienen ninguno de: {allowed_roles}"
                ),
            )

        return current_user

    return role_checker
