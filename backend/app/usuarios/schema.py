from sqlmodel import SQLModel, Field
from pydantic import EmailStr


class UsuarioCreate(SQLModel):
    """Datos requeridos para registrar un usuario."""
    username: str
    full_name: str
    email: EmailStr
    password: str = Field(min_length=8)


class UsuarioPublic(SQLModel):
    """Vista pública del usuario — excluye hashed_password."""
    id: int
    username: str
    full_name: str
    email: str
    role: str
    disabled: bool


class UsuarioToken(SQLModel):
    """Respuesta del endpoint /token."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
