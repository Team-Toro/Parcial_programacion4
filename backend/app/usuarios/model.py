"""
Modelo de Usuario — tabla 'usuario' en PostgreSQL.

Campos clave para seguridad:
  - hashed_password: hash bcrypt (nunca texto plano).
  - role: "user" | "admin" — usado por require_role() para RBAC.
  - disabled: permite desactivar cuentas sin eliminarlas.
"""

from sqlmodel import SQLModel, Field


class Usuario(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    full_name: str
    email: str = Field(index=True, unique=True)
    hashed_password: str
    role: str = Field(default="user")
    disabled: bool = Field(default=False)
