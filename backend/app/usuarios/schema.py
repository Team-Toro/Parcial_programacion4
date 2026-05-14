from sqlmodel import SQLModel, Field
from pydantic import EmailStr


class UsuarioCreate(SQLModel):
    """Datos requeridos para registrar un usuario."""
    last_name: str
    first_name: str
    email: EmailStr
    celular: str = Field(max_length=20)
    password: str = Field(min_length=8)


class UsuarioPublic(SQLModel):
    """Vista pública del usuario — excluye hashed_password."""
    id: int
    first_name: str
    last_name: str
    email: str
    celular: str
    roles: list[str]
    disabled: bool


class UsuarioToken(SQLModel):
    """Respuesta del endpoint /token."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: str


class UsuarioRolesUpdate(SQLModel):
    """Actualización de roles de usuario (admin)."""
    roles: list[str] | None = None


class RefreshTokenRequest(SQLModel):
    """Body para los endpoints /auth/refresh y /auth/logout."""
    refresh_token: str
