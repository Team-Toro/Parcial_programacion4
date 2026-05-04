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
from app.usuarios.model import Usuario, UserCreate, Token
from app.usuarios.repository import UsuarioRepository


class UsuarioService:
    """Lógica de negocio para autenticación y gestión de usuarios."""

    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.repo = UsuarioRepository(uow.session)

    def get_by_username(self, username: str) -> Usuario | None:
        """Obtiene un usuario por username (sin lanzar HTTPException)."""
        return self.repo.get_by_username(username)

    def register(self, user_in: UserCreate) -> Usuario:
        """Registra un nuevo usuario. El rol siempre es 'user'."""
        if self.repo.get_by_username(user_in.username):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El nombre de usuario ya está en uso",
            )

        if self.repo.get_by_email(user_in.email):
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
        return self.repo.add(usuario)

    def authenticate(self, username: str, password: str) -> Token:
        """Autentica con username + password y retorna un Token con JWT."""
        user = self.repo.get_by_username(username)

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
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    def list_all(self) -> list[Usuario]:
        """Lista todos los usuarios."""
        return self.repo.get_all()

    def set_disabled(self, user_id: int, disabled: bool) -> Usuario:
        """Activa o desactiva la cuenta de un usuario."""
        user = self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )
        user.disabled = disabled
        return self.repo.update(user)
