"""
Engine SQLModel y factory de sesión.

Importado de unidad 6
Usa PostgreSQL (igual que u_05_v2) configurado vía variables de entorno.
"""

from sqlmodel import SQLModel, Session, create_engine
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, echo=False)


def get_session():
    """Dependencia FastAPI: provee una sesión de BD por request."""
    with Session(engine) as session:
        yield session


def create_all_tables() -> None:
    """Crea las tablas registradas en SQLModel.metadata al arrancar la app."""
    import app.usuarios.model  # noqa: F401 — registra el modelo en metadata
    import app.refresh_tokens.model  # noqa: F401 — RefreshToken vive en su propio módulo
    import app.categorias.model  # noqa: F401
    import app.productos.model  # noqa: F401
    import app.ingredientes.model  # noqa: F401
    import app.pedidos.model  # noqa: F401
    import app.pagos.model  # noqa: F401
    import app.direcciones.model  # noqa: F401
    import app.formas_pago.model  # noqa: F401
    import app.estados_pedido.model  # noqa: F401

    SQLModel.metadata.create_all(engine)
