"""
Configuración centralizada leída desde variables de entorno.

Adopta el patrón de u_05_v2: variables individuales de PostgreSQL
con @computed_field para construir DATABASE_URL automáticamente.
Los valores sensibles (SECRET_KEY, POSTGRES_PASSWORD) viven en .env.
"""

from decimal import Decimal
from typing import Optional
from pydantic import computed_field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_db: str = "food_store"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        """
        Construye la URL de conexión a PostgreSQL.
        """
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ─── JWT ──────────────────────────────────────────────────────────────────
    SECRET_KEY: str  # Obligatorio — sin default. Mínimo 32 chars.
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    COSTO_ENVIO_DEFAULT: Decimal = Decimal("50.00")

    # ─── MercadoPago ─────────────────────────────────────────────────────────
    MP_ACCESS_TOKEN: Optional[str] = None
    MP_PUBLIC_KEY: Optional[str] = None
    # URL pública del backend (ngrok en dev). Usada para webhook y back_urls.
    NGROK_URL: Optional[str] = None

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",  # ignora vars extra del .env (ej. DATABASE_URL literal)
    }


# Instancia global — importar desde aquí en toda la app
settings = Settings()
