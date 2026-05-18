from typing import Optional, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import Column, String
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.usuarios.model import Usuario


class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_tokens"

    id: int | None = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuarios.id", nullable=False, index=True)
    token_hash: str = Field(sa_column=Column(String(64), unique=True, nullable=False))
    expires_at: datetime = Field(nullable=False)
    revoked_at: Optional[datetime] = Field(default=None, nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    usuario: Optional["Usuario"] = Relationship(back_populates="refresh_tokens")
