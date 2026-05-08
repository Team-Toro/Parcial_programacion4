"""
Script de seed — carga datos iniciales para pruebas.
Idempotente: se puede ejecutar múltiples veces sin duplicar datos.

Uso:
    python -m app.db.seed

Requiere PostgreSQL corriendo con las variables de .env configuradas.

Crea:
  - admin / Admin1234!  (role=admin)
  - juan / Juan1234!    (role=user)
  - Ingredientes con unidad y stock realistas
  - Categorías y productos con ingredientes
"""

from sqlmodel import Session, select
from app.core.database import engine, create_all_tables
from app.core.security import hash_password
from app.usuarios.model import Usuario
from app.ingredientes.model import Ingrediente, UnidadMedida
from app.categorias.model import Categoria
from app.productos.model import Producto, ProductoCategoria, ProductoIngrediente
from decimal import Decimal


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

INGREDIENTES_INICIALES = [
    {"nombre": "Harina",       "unidad": UnidadMedida.KG,    "stock_actual": 50.0,  "es_alergeno": True},
    {"nombre": "Sal",          "unidad": UnidadMedida.KG,    "stock_actual": 5.0,   "es_alergeno": False},
    {"nombre": "Azúcar",       "unidad": UnidadMedida.KG,    "stock_actual": 20.0,  "es_alergeno": False},
    {"nombre": "Levadura",     "unidad": UnidadMedida.G,     "stock_actual": 500.0, "es_alergeno": False},
    {"nombre": "Leche",        "unidad": UnidadMedida.LITRO, "stock_actual": 30.0,  "es_alergeno": True},
    {"nombre": "Manteca",      "unidad": UnidadMedida.KG,    "stock_actual": 10.0,  "es_alergeno": True},
    {"nombre": "Huevo",        "unidad": UnidadMedida.UNIDAD,"stock_actual": 200.0, "es_alergeno": True},
    {"nombre": "Aceite",       "unidad": UnidadMedida.LITRO, "stock_actual": 15.0,  "es_alergeno": False},
    {"nombre": "Queso",        "unidad": UnidadMedida.KG,    "stock_actual": 8.0,   "es_alergeno": True},
    {"nombre": "Tomate",       "unidad": UnidadMedida.KG,    "stock_actual": 25.0,  "es_alergeno": False},
]

CATEGORIAS_INICIALES = [
    {"nombre": "Panadería",    "descripcion": "Productos de panadería artesanal"},
    {"nombre": "Pastelería",   "descripcion": "Tortas, facturas y postres"},
    {"nombre": "Pizzas",       "descripcion": "Pizzas a la piedra"},
]

# (nombre_producto, precio, categoria_nombre, [(ingrediente_nombre, cantidad, es_removible)])
PRODUCTOS_INICIALES = [
    (
        "Pan francés",
        Decimal("150.00"),
        "Panadería",
        [
            ("Harina",   0.3,  False),
            ("Sal",      0.01, False),
            ("Levadura", 5.0,  False),
        ],
    ),
    (
        "Medialunas",
        Decimal("280.00"),
        "Pastelería",
        [
            ("Harina",   0.25, False),
            ("Manteca",  0.1,  False),
            ("Azúcar",   0.05, False),
            ("Huevo",    1.0,  False),
        ],
    ),
    (
        "Pizza Mozzarella",
        Decimal("850.00"),
        "Pizzas",
        [
            ("Harina",   0.4,  False),
            ("Queso",    0.2,  True),
            ("Tomate",   0.15, True),
            ("Aceite",   0.02, False),
            ("Sal",      0.005,False),
        ],
    ),
]


def run() -> None:
    print("=== Seed — Food Store (PostgreSQL) ===")
    create_all_tables()

    with Session(engine) as session:
        # Usuarios
        print("\n[Usuarios]")
        for data in USUARIOS_INICIALES:
            existing = session.exec(
                select(Usuario).where(Usuario.username == data["username"])
            ).first()
            if existing:
                print(f"  [=] Ya existe: {data['username']} ({data['role']})")
            else:
                usuario = Usuario(
                    username        = data["username"],
                    full_name       = data["full_name"],
                    email           = data["email"],
                    hashed_password = hash_password(data["password"]),
                    role            = data["role"],
                )
                session.add(usuario)
                print(f"  [+] Creado:    {data['username']} / {data['password']}  (role={data['role']})")

        # Ingredientes
        print("\n[Ingredientes]")
        ing_map: dict[str, Ingrediente] = {}
        for data in INGREDIENTES_INICIALES:
            existing = session.exec(
                select(Ingrediente).where(Ingrediente.nombre == data["nombre"])
            ).first()
            if existing:
                ing_map[data["nombre"]] = existing
                print(f"  [=] Ya existe: {data['nombre']}")
            else:
                ing = Ingrediente(
                    nombre      = data["nombre"],
                    unidad      = data["unidad"],
                    stock_actual= data["stock_actual"],
                    es_alergeno = data["es_alergeno"],
                )
                session.add(ing)
                session.flush()
                ing_map[data["nombre"]] = ing
                print(f"  [+] Creado: {data['nombre']} ({data['stock_actual']} {data['unidad'].value})")

        # Categorías
        print("\n[Categorías]")
        cat_map: dict[str, Categoria] = {}
        for data in CATEGORIAS_INICIALES:
            existing = session.exec(
                select(Categoria).where(Categoria.nombre == data["nombre"])
            ).first()
            if existing:
                cat_map[data["nombre"]] = existing
                print(f"  [=] Ya existe: {data['nombre']}")
            else:
                cat = Categoria(nombre=data["nombre"], descripcion=data["descripcion"])
                session.add(cat)
                session.flush()
                cat_map[data["nombre"]] = cat
                print(f"  [+] Creado: {data['nombre']}")

        # Productos
        print("\n[Productos]")
        for nombre, precio, cat_nombre, ingredientes in PRODUCTOS_INICIALES:
            existing = session.exec(
                select(Producto).where(Producto.nombre == nombre)
            ).first()
            if existing:
                print(f"  [=] Ya existe: {nombre}")
                continue

            producto = Producto(
                nombre      = nombre,
                precio_base = precio,
                disponible  = True,
            )
            session.add(producto)
            session.flush()

            if cat_nombre in cat_map:
                session.add(ProductoCategoria(
                    producto_id  = producto.id,
                    categoria_id = cat_map[cat_nombre].id,
                ))

            for ing_nombre, cantidad, es_removible in ingredientes:
                if ing_nombre in ing_map:
                    session.add(ProductoIngrediente(
                        producto_id    = producto.id,
                        ingrediente_id = ing_map[ing_nombre].id,
                        cantidad       = cantidad,
                        es_removible   = es_removible,
                    ))

            print(f"  [+] Creado: {nombre} (${precio})")

        session.commit()

    print("\n=== Seed completado ===")
    print("Usuarios:")
    print("  admin / Admin1234!  → role=admin")
    print("  juan  / Juan1234!   → role=user")
    print()


if __name__ == "__main__":
    run()
