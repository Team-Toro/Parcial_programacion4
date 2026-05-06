"""
Service de Usuario — lógica de negocio.

Stateless, orquesta operaciones sobre los repositorios a través del UoW.
Lanza HTTPException. No hace commit/rollback directamente.

Capa: Service
Conoce a: UoW, Repository (indirectamente vía UoW)
NO conoce a: Router

Regla de imports:
    Router → Service → UoW → Repository → Model
"""

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from app.uow.unit_of_work import UnitOfWork
from .model import Usuario
from .repository import UsuarioRepository
from .schema import UsuarioCreate, UsuarioToken


class UsuarioService:
    """Lógica de negocio para autenticación y gestión de usuarios."""

    def get_by_username(self, uow: UnitOfWork, username: str) -> Usuario | None:
        """Obtiene un usuario por username (sin lanzar HTTPException)."""
        repo = UsuarioRepository(uow.session)
        return repo.get_by_username(username)

    def register(self, uow: UnitOfWork, user_in: UsuarioCreate) -> Usuario:
        """Registra un nuevo usuario. El rol siempre es 'user'."""
        repo = UsuarioRepository(uow.session)
        if repo.get_by_username(user_in.username):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El nombre de usuario ya está en uso",
            )

        if repo.get_by_email(user_in.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El email ya está registrado",
            )

        usuario = Usuario(
            username=user_in.username,
            full_name=user_in.full_name,
            email=user_in.email,
            hashed_password=hash_password(user_in.password),
            role="user",
        )
        repo.add(usuario)
        repo.flush()
        repo.refresh(usuario)
        return usuario

    def authenticate(self, uow: UnitOfWork, username: str, password: str) -> UsuarioToken:
        """Autentica con username + password y retorna un Token con JWT."""
        repo = UsuarioRepository(uow.session)
        user = repo.get_by_username(username)

        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if user.disabled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cuenta de usuario desactivada",
            )

        access_token = create_access_token(
            data={"sub": user.username, "role": user.role}
        )
        return UsuarioToken(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    def list_all(self, uow: UnitOfWork) -> list[Usuario]:
        """Lista todos los usuarios."""
        repo = UsuarioRepository(uow.session)
        return repo.get_all()

    def list(
        self,
        uow: UnitOfWork,
        offset: int = 0,
        limit: int = 20,
        q: str | None = None,
        role: str | None = None,
        disabled: bool | None = None,
        sort: str | None = None,
        order: str = "asc",
    ) -> list[Usuario]:
        repo = UsuarioRepository(uow.session)
        return repo.list(
            offset=offset,
            limit=limit,
            q=q,
            role=role,
            disabled=disabled,
            sort=sort,
            order=order,
        )

    def set_disabled(self, uow: UnitOfWork, user_id: int, disabled: bool) -> Usuario:
        """Activa o desactiva la cuenta de un usuario."""
        repo = UsuarioRepository(uow.session)
        user = repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )
        user.disabled = disabled
        repo.add(user)
        repo.flush()
        repo.refresh(user)
        return user
