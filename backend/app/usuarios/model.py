"""
Modelo de Usuario — tablas de identidad y acceso en PostgreSQL.

Campos clave para seguridad:
  - hashed_password: hash bcrypt (nunca texto plano).
  - roles: relación many-to-many vía UsuarioRol.
  - disabled: permite desactivar cuentas sin eliminarlas.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.refresh_tokens.model import RefreshToken


class Rol(SQLModel, table=True):
    __tablename__ = "roles"
    codigo: str = Field(primary_key=True, max_length=20)
    nombre: str = Field(unique=True, nullable=False, max_length=50)
    description: str = Field(nullable=False)


class Usuario(SQLModel, table=True):
    __tablename__ = "usuarios"
    id: int | None = Field(default=None, primary_key=True)
    last_name: str = Field(index=True)
    first_name: str = Field()
    email: str = Field(index=True, unique=True)
    celular: str = Field(max_length=20)
    hashed_password: str
    disabled: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    deleted_at: Optional[datetime] = Field(default=None, nullable=True)

    refresh_tokens: List["RefreshToken"] = Relationship(back_populates="usuario")


class UsuarioRol(SQLModel, table=True):
    __tablename__ = "usuario_rol"
    usuario_id: int = Field(foreign_key="usuarios.id", primary_key=True)
    role_id: str = Field(foreign_key="roles.codigo", primary_key=True, max_length=20)
    assigned_by: Optional[int] = Field(default=None, foreign_key="usuarios.id")
    expires_at: Optional[datetime] = Field(default=None, nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
