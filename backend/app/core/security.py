"""
Utilidades de seguridad: hashing de contraseñas y manejo de JWT.

- hash_password / verify_password: bcrypt vía passlib.
- create_access_token / decode_access_token: JWT con python-jose (HS256).
- generate_refresh_token / hash_token: tokens opacos para refresh.

Separado del router para poder reutilizarse en seeds, tests, etc.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# ─── Hashing (bcrypt) ─────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Genera el hash bcrypt de una contraseña en texto plano."""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verifica una contraseña en texto plano contra su hash bcrypt."""
    return pwd_context.verify(plain, hashed)


# ─── JWT ──────────────────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Crea un JWT firmado con HS256.

    Payload mínimo esperado:
        { "sub": email, "roles": ["ADMIN", ...] }

    Se agrega automáticamente:
        "type": "access"
        "exp":  timestamp de expiración
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"type": "access", "exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """
    Decodifica y verifica un JWT.

    Retorna el payload si la firma y expiración son válidas,
    o None si cualquier verificación falla.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


# ─── Refresh Token ────────────────────────────────────────────────────────────
def hash_token(raw: str) -> str:
    """SHA-256 hex digest del token raw."""
    return hashlib.sha256(raw.encode()).hexdigest()


def generate_refresh_token() -> tuple[str, str]:
    """Genera (raw, hash). raw tiene ~64 chars URL-safe. hash es SHA-256 hex."""
    raw = secrets.token_urlsafe(48)
    return raw, hash_token(raw)
