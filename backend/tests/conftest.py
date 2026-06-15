"""
Configuración global de tests.

Estrategia:
- SQLite in-memory con StaticPool: una sola conexión compartida → los datos
  sembrados son visibles por las sesiones que abre cada request.
- Las rutas usan el patrón UoW (no una dependency de sesión), así que en vez de
  overridear dependencias se monkeypatchea el `engine` que usa el UnitOfWork para
  apuntarlo al SQLite de test.
- Se desactiva el rate limiter (slowapi) para que múltiples logins no devuelvan 429.
- Shim de compilación JSONB→JSON: el modelo Producto usa JSONB (PostgreSQL), que
  no compila en SQLite. El shim lo traduce solo para el dialecto sqlite, sin tocar
  el código de producción.

NOTA: el TestClient se instancia SIN usarlo como context manager a propósito.
Si se usara `with TestClient(app)`, dispararía el evento startup → create_all_tables()
con el engine de PostgreSQL → intentaría conectarse a Postgres y fallaría.
"""

import os

# SECRET_KEY es obligatorio en Settings (sin default). Debe estar antes de importar la app.
os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-characters-long-aaaa")

from decimal import Decimal

import pytest
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool
from fastapi.testclient import TestClient


# ─── Shim JSONB → JSON para SQLite (solo tests) ──────────────────────────────
@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(element, compiler, **kw):  # noqa: ANN001
    return "JSON"


# Importar TODOS los modelos para que queden registrados en SQLModel.metadata
from app.usuarios.model import Usuario, Rol, UsuarioRol  # noqa: E402
from app.refresh_tokens.model import RefreshToken  # noqa: E402,F401
from app.direcciones.model import DireccionEntrega  # noqa: E402
from app.categorias.model import Categoria  # noqa: E402
from app.ingredientes.model import Ingrediente, UnidadMedida  # noqa: E402,F401
from app.productos.model import Producto, ProductoCategoria, ProductoIngrediente  # noqa: E402,F401
from app.estados_pedido.model import EstadoPedido  # noqa: E402
from app.formas_pago.model import FormaPago  # noqa: E402
from app.pedidos.model import Pedido, DetallePedido, HistorialEstadoPedido  # noqa: E402,F401
from app.pagos.model import Pago  # noqa: E402,F401

from app.main import app  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.core.limiter import limiter  # noqa: E402


@pytest.fixture(name="engine")
def engine_fixture(monkeypatch):
    """SQLite in-memory fresco por test. Apunta el UoW a este engine."""
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(test_engine)
    # Todas las UoW creadas durante el request usarán este engine.
    monkeypatch.setattr("app.uow.unit_of_work.engine", test_engine)
    yield test_engine
    SQLModel.metadata.drop_all(test_engine)


@pytest.fixture(name="session")
def session_fixture(engine):
    """Sesión para sembrar datos y hacer asserts directos a la BD de test."""
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(engine):
    """TestClient sin context manager (no dispara startup → no toca Postgres)."""
    limiter.enabled = False
    client = TestClient(app)
    yield client
    limiter.enabled = True


@pytest.fixture
def seed_data(session):
    """
    Datos mínimos: 4 roles, 6 estados, 2 formas de pago, admin, cliente,
    dirección del cliente, 1 categoría y 1 producto (sin ingredientes → stock = stock_cantidad).
    Devuelve IDs (no objetos ORM) para evitar instancias detached entre sesiones.
    """
    # Roles (description es NOT NULL)
    session.add_all([
        Rol(codigo="ADMIN", nombre="Administrador", description="Acceso total"),
        Rol(codigo="CLIENTE", nombre="Cliente", description="Cliente"),
        Rol(codigo="STOCK", nombre="Stock", description="Gestor de stock"),
        Rol(codigo="PEDIDOS", nombre="Pedidos", description="Gestor de pedidos"),
    ])

    # Estados (el proyecto tiene 6: incluye EN_CAMINO)
    session.add_all([
        EstadoPedido(codigo="PENDIENTE", descripcion="Pendiente", orden=1, es_terminal=False),
        EstadoPedido(codigo="CONFIRMADO", descripcion="Confirmado", orden=2, es_terminal=False),
        EstadoPedido(codigo="EN_PREP", descripcion="En preparación", orden=3, es_terminal=False),
        EstadoPedido(codigo="EN_CAMINO", descripcion="En camino", orden=4, es_terminal=False),
        EstadoPedido(codigo="ENTREGADO", descripcion="Entregado", orden=5, es_terminal=True),
        EstadoPedido(codigo="CANCELADO", descripcion="Cancelado", orden=6, es_terminal=True),
    ])

    # Formas de pago
    session.add_all([
        FormaPago(codigo="MERCADOPAGO", descripcion="MercadoPago", habilitado=True),
        FormaPago(codigo="EFECTIVO", descripcion="Efectivo", habilitado=True),
    ])

    admin = Usuario(first_name="Admin", last_name="Test", email="admin@test.com",
                    celular="1111", hashed_password=hash_password("Admin1234!"))
    cliente = Usuario(first_name="Juan", last_name="Cliente", email="cliente@test.com",
                      celular="2222", hashed_password=hash_password("Cliente1234!"))
    session.add_all([admin, cliente])
    session.commit()
    session.refresh(admin)
    session.refresh(cliente)

    session.add_all([
        UsuarioRol(usuario_id=admin.id, role_id="ADMIN"),
        UsuarioRol(usuario_id=cliente.id, role_id="CLIENTE"),
    ])

    direccion = DireccionEntrega(
        usuario_id=cliente.id, alias="Casa",
        linea1="Calle Test 123", ciudad="Mendoza", provincia="Mendoza",
        es_principal=True,
    )
    session.add(direccion)

    categoria = Categoria(nombre="Hamburguesas", descripcion="Burgers")
    session.add(categoria)
    session.commit()
    session.refresh(categoria)
    session.refresh(direccion)

    producto = Producto(
        nombre="Hamburguesa Test", descripcion="De prueba",
        precio_base=Decimal("2500.00"), stock_cantidad=100, disponible=True,
    )
    session.add(producto)
    session.commit()
    session.refresh(producto)

    session.add(ProductoCategoria(producto_id=producto.id, categoria_id=categoria.id))
    session.commit()

    return {
        "admin_id": admin.id,
        "cliente_id": cliente.id,
        "categoria_id": categoria.id,
        "producto_id": producto.id,
        "direccion_id": direccion.id,
    }


def login(client, email, password):
    """Hace login (OAuth2 form). El TestClient guarda las cookies HttpOnly resultantes."""
    resp = client.post(
        "/api/v1/auth/token",
        data={"username": email, "password": password},
    )
    assert resp.status_code == 200, resp.text
    return resp


@pytest.fixture
def admin_client(client, seed_data):
    """TestClient autenticado como ADMIN."""
    login(client, "admin@test.com", "Admin1234!")
    return client


@pytest.fixture
def cliente_client(client, seed_data):
    """TestClient autenticado como CLIENTE."""
    login(client, "cliente@test.com", "Cliente1234!")
    return client
