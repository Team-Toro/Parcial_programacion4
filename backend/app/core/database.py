"""
Engine SQLModel y factory de sesión.

Importado de unidad 6
Usa PostgreSQL (igual que u_05_v2) configurado vía variables de entorno.
"""

from sqlmodel import SQLModel, create_engine
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, echo=False)


def create_all_tables() -> None:
    """Crea las tablas registradas en SQLModel.metadata al arrancar la app."""
    import app.usuarios.model  # noqa: F401
    import app.categorias.model  # noqa: F401
    import app.productos.model  # noqa: F401
    import app.ingredientes.model  # noqa: F401

    SQLModel.metadata.create_all(engine)
