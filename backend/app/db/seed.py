"""
Script de seed — carga datos iniciales para pruebas.
Idempotente: se puede ejecutar múltiples veces sin duplicar datos.

Uso:
    python -m app.db.seed

Requiere PostgreSQL corriendo con las variables de .env configuradas.

Crea:
  - 2 usuarios (admin + user)
  - 6 categorías (jerárquicas, 3 niveles)
  - 5 ingredientes
  - 8 productos con relaciones
"""

from sqlmodel import Session, select
from app.core.database import engine, create_all_tables
from app.core.security import hash_password
from app.usuarios.model import Usuario
from app.categorias.model import Categoria
from app.ingredientes.model import Ingrediente
from app.productos.model import Producto, ProductoCategoria, ProductoIngrediente


USUARIOS_INICIALES = [
    {
        "username":  "admin",
        "full_name": "Administrador del Sistema",
        "email":     "admin@example.com",
        "password":  "Admin1234!",
        "role":      "admin",
    },
    {
        "username":  "juan",
        "full_name": "Juan Pérez",
        "email":     "juan@example.com",
        "password":  "Juan1234!",
        "role":      "user",
    },
]

CATEGORIAS_INICIALES = [
    {"nombre": "Bebidas",       "descripcion": "Bebidas frías y calientes",                    "parent_id": None},
    {"nombre": "Comidas",       "descripcion": "Platos preparados",                            "parent_id": None},
    {"nombre": "Gaseosas",      "descripcion": "Bebidas carbonatadas",                         "parent_id": None},
    {"nombre": "Aguas",         "descripcion": "Agua mineral y saborizada",                    "parent_id": None},
    {"nombre": "Pizzas",        "descripcion": "Pizzas clásicas y especiales",                 "parent_id": None},
    {"nombre": "Sandwiches",    "descripcion": "Sandwiches de miga y pan artesanal",           "parent_id": None},
]

CATEGORIAS_HIJOS = [
    {"nombre": "Bebidas",   "hijos": ["Gaseosas", "Aguas"]},
    {"nombre": "Comidas",   "hijos": ["Pizzas", "Sandwiches"]},
]

INGREDIENTES_INICIALES = [
    {"nombre": "Harina",           "descripcion": "Harina de trigo 000",            "es_alergeno": True},
    {"nombre": "Queso Mozzarella", "descripcion": "Queso cremoso",                  "es_alergeno": True},
    {"nombre": "Tomate",           "descripcion": "Tomate perita",                  "es_alergeno": False},
    {"nombre": "Agua",             "descripcion": "Agua mineral",                   "es_alergeno": False},
    {"nombre": "Levadura",         "descripcion": "Levadura fresca",                "es_alergeno": False},
]

PRODUCTOS_INICIALES = [
    {
        "nombre": "Pizza Margherita",
        "descripcion": "Muzzarella, tomate y albahaca",
        "precio_base": 4500.00,
        "stock_cantidad": 20,
        "disponible": True,
        "categorias": ["Pizzas"],
        "ingredientes": [{"nombre": "Harina"}, {"nombre": "Queso Mozzarella"}, {"nombre": "Tomate"}, {"nombre": "Levadura"}],
    },
    {
        "nombre": "Pizza Napolitana",
        "descripcion": "Muzzarella, tomate, aceitunas y orégano",
        "precio_base": 5000.00,
        "stock_cantidad": 15,
        "disponible": True,
        "categorias": ["Pizzas"],
        "ingredientes": [{"nombre": "Harina"}, {"nombre": "Queso Mozzarella"}, {"nombre": "Tomate"}, {"nombre": "Levadura"}],
    },
    {
        "nombre": "Sandwich de Miga",
        "descripcion": "Jamón y queso en pan de miga",
        "precio_base": 2500.00,
        "stock_cantidad": 30,
        "disponible": True,
        "categorias": ["Sandwiches"],
        "ingredientes": [{"nombre": "Harina"}, {"nombre": "Queso Mozzarella"}, {"nombre": "Tomate"}],
    },
    {
        "nombre": "Agua Mineral 500ml",
        "descripcion": "Agua mineral natural",
        "precio_base": 800.00,
        "stock_cantidad": 100,
        "disponible": True,
        "categorias": ["Aguas"],
        "ingredientes": [{"nombre": "Agua"}],
    },
    {
        "nombre": "Agua Saborizada",
        "descripcion": "Agua con sabor a limón",
        "precio_base": 1000.00,
        "stock_cantidad": 50,
        "disponible": True,
        "categorias": ["Aguas"],
        "ingredientes": [{"nombre": "Agua"}],
    },
    {
        "nombre": "Coca Cola 500ml",
        "descripcion": "Gaseosa cola",
        "precio_base": 1200.00,
        "stock_cantidad": 80,
        "disponible": True,
        "categorias": ["Gaseosas"],
        "ingredientes": [{"nombre": "Agua"}],
    },
    {
        "nombre": "Pizza Sin Stock",
        "descripcion": "Producto temporalmente agotado",
        "precio_base": 4000.00,
        "stock_cantidad": 0,
        "disponible": True,
        "categorias": ["Pizzas"],
        "ingredientes": [{"nombre": "Harina"}, {"nombre": "Queso Mozzarella"}, {"nombre": "Tomate"}, {"nombre": "Levadura"}],
    },
    {
        "nombre": "Pizza Deshabilitada",
        "descripcion": "Producto deshabilitado del catálogo",
        "precio_base": 4200.00,
        "stock_cantidad": 5,
        "disponible": False,
        "categorias": ["Pizzas"],
        "ingredientes": [{"nombre": "Harina"}, {"nombre": "Queso Mozzarella"}, {"nombre": "Tomate"}],
    },
]


def _get_or_create_categoria(session, nombre, descripcion, parent_id):
    existing = session.exec(select(Categoria).where(Categoria.nombre == nombre)).first()
    if existing:
        return existing
    cat = Categoria(nombre=nombre, descripcion=descripcion, parent_id=parent_id)
    session.add(cat)
    session.flush()
    return cat


def _get_ingrediente(session, nombre):
    return session.exec(select(Ingrediente).where(Ingrediente.nombre == nombre)).first()


def run() -> None:
    print("=== Seed — Food Store ===")
    create_all_tables()

    with Session(engine) as session:

        # ── Usuarios ──
        for data in USUARIOS_INICIALES:
            existing = session.exec(
                select(Usuario).where(Usuario.username == data["username"])
            ).first()
            if existing:
                print(f"  [=] Usuario ya existe: {data['username']}")
            else:
                usuario = Usuario(
                    username=data["username"],
                    full_name=data["full_name"],
                    email=data["email"],
                    hashed_password=hash_password(data["password"]),
                    role=data["role"],
                )
                session.add(usuario)
                print(f"  [+] Usuario creado: {data['username']} / {data['password']}")

        # ── Categorías ──
        cat_map = {}
        for c in CATEGORIAS_INICIALES:
            cat = _get_or_create_categoria(session, c["nombre"], c["descripcion"], c["parent_id"])
            cat_map[c["nombre"]] = cat
            print(f"  [=] Categoría: {c['nombre']}")

        for entry in CATEGORIAS_HIJOS:
            padre_nombre = entry["nombre"]
            hijos = entry["hijos"]
            padre = cat_map[padre_nombre]
            for hijo_nombre in hijos:
                hijo = cat_map[hijo_nombre]
                if hijo.parent_id is None:
                    hijo.parent_id = padre.id
                    print(f"  [+] {hijo_nombre} → hijo de {padre_nombre}")

        # ── Ingredientes ──
        ing_map = {}
        for ing_data in INGREDIENTES_INICIALES:
            existing = session.exec(select(Ingrediente).where(Ingrediente.nombre == ing_data["nombre"])).first()
            if existing:
                ing_map[ing_data["nombre"]] = existing
                print(f"  [=] Ingrediente ya existe: {ing_data['nombre']}")
            else:
                ing = Ingrediente(**ing_data)
                session.add(ing)
                session.flush()
                ing_map[ing_data["nombre"]] = ing
                print(f"  [+] Ingrediente creado: {ing_data['nombre']}")

        # ── Productos ──
        for prod_data in PRODUCTOS_INICIALES:
            existing = session.exec(select(Producto).where(Producto.nombre == prod_data["nombre"])).first()
            if existing:
                print(f"  [=] Producto ya existe: {prod_data['nombre']}")
                continue

            categorias = prod_data.pop("categorias")
            ingredientes_data = prod_data.pop("ingredientes")

            producto = Producto(**prod_data)
            session.add(producto)
            session.flush()

            for cat_nombre in categorias:
                cat = cat_map[cat_nombre]
                session.add(ProductoCategoria(producto_id=producto.id, categoria_id=cat.id))

            for ing_ref in ingredientes_data:
                ing = ing_map[ing_ref["nombre"]]
                session.add(ProductoIngrediente(producto_id=producto.id, ingrediente_id=ing.id))

            print(f"  [+] Producto creado: {prod_data['nombre']}")

        session.commit()

    print()
    print("Usuarios disponibles para pruebas:")
    print("  admin / Admin1234!  → role=admin  (acceso total)")
    print("  juan  / Juan1234!   → role=user   (acceso básico)")
    print()
    print("Seed completado.")


if __name__ == "__main__":
    run()
