"""
Script de seed — carga usuarios iniciales para pruebas.
Idempotente: se puede ejecutar múltiples veces sin duplicar datos.

Uso:
    python -m app.db.seed

Requiere PostgreSQL corriendo con las variables de .env configuradas.

Crea:
  - admin / Admin1234!  (role=admin)
  - juan / Juan1234!    (role=user)
"""

from sqlmodel import Session, select
from decimal import Decimal
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
    {
        "nombre": "Bebidas",
        "descripcion": "Bebidas frías y calientes",
        "subcategorias": [
            {"nombre": "Gaseosas", "descripcion": "Con gas y sin alcohol"},
            {"nombre": "Jugos", "descripcion": "Jugos naturales"},
        ],
    },
    {
        "nombre": "Comidas",
        "descripcion": "Platos principales",
        "subcategorias": [
            {"nombre": "Hamburguesas", "descripcion": "Clásicas y gourmet"},
            {"nombre": "Pizzas", "descripcion": "Tradicionales y especiales"},
        ],
    },
    {
        "nombre": "Postres",
        "descripcion": "Dulces y helados",
        "subcategorias": [
            {"nombre": "Helados", "descripcion": "Sabores clásicos"},
            {"nombre": "Tortas", "descripcion": "Porciones individuales"},
        ],
    },
    {"nombre": "Entradas", "descripcion": "Para abrir el apetito"},
    {"nombre": "Ensaladas", "descripcion": "Opciones frescas"},
    {"nombre": "Pastas", "descripcion": "Caseras y rellenas"},
    {"nombre": "Sándwiches", "descripcion": "Rápidos y sabrosos"},
    {"nombre": "Cafetería", "descripcion": "Café y acompañamientos"},
    {"nombre": "Vegano", "descripcion": "Opciones sin productos animales"},
    {"nombre": "Sin gluten", "descripcion": "Opciones aptas celíacos"},
]

INGREDIENTES_INICIALES = [
    {"nombre": "Harina", "descripcion": "Harina de trigo 000", "es_alergeno": True},
    {"nombre": "Leche", "descripcion": "Leche entera", "es_alergeno": True},
    {"nombre": "Queso", "descripcion": "Queso mozzarella", "es_alergeno": True},
    {"nombre": "Tomate", "descripcion": "Tomate fresco", "es_alergeno": False},
    {"nombre": "Lechuga", "descripcion": "Lechuga mantecosa", "es_alergeno": False},
    {"nombre": "Cebolla", "descripcion": "Cebolla morada", "es_alergeno": False},
    {"nombre": "Pollo", "descripcion": "Pechuga de pollo", "es_alergeno": False},
    {"nombre": "Carne vacuna", "descripcion": "Carne de res", "es_alergeno": False},
    {"nombre": "Huevo", "descripcion": "Huevo de gallina", "es_alergeno": True},
    {"nombre": "Azúcar", "descripcion": "Azúcar blanca", "es_alergeno": False},
    {"nombre": "Chocolate", "descripcion": "Cacao y azúcar", "es_alergeno": True},
    {"nombre": "Pan", "descripcion": "Pan artesanal", "es_alergeno": True},
    {"nombre": "Sal", "descripcion": "Sal fina", "es_alergeno": False},
    {"nombre": "Pimienta", "descripcion": "Pimienta negra", "es_alergeno": False},
    {"nombre": "Aceite de oliva", "descripcion": "Oliva extra virgen", "es_alergeno": False},
    {"nombre": "Ajo", "descripcion": "Ajo fresco", "es_alergeno": False},
    {"nombre": "Perejil", "descripcion": "Hierba fresca", "es_alergeno": False},
    {"nombre": "Jamón", "descripcion": "Jamón cocido", "es_alergeno": False},
    {"nombre": "Bacon", "descripcion": "Panceta ahumada", "es_alergeno": False},
    {"nombre": "Champiñones", "descripcion": "Frescos laminados", "es_alergeno": False},
    {"nombre": "Pimiento", "descripcion": "Pimiento rojo", "es_alergeno": False},
    {"nombre": "Mayonesa", "descripcion": "Salsa de huevo", "es_alergeno": True},
    {"nombre": "Ketchup", "descripcion": "Salsa de tomate", "es_alergeno": False},
    {"nombre": "Mostaza", "descripcion": "Salsa de mostaza", "es_alergeno": True},
]

PRODUCTOS_INICIALES = [
    {
        "nombre": "Hamburguesa Clásica",
        "descripcion": "Carne, queso y vegetales",
        "precio_base": Decimal("3200.00"),
        "stock_cantidad": 25,
        "disponible": True,
        "imagenes_url": ["https://images.unsplash.com/photo-1550547660-d9450f859349"],
        "categorias": ["Comidas", "Hamburguesas"],
        "ingredientes": [
            {"nombre": "Carne vacuna", "es_removible": False},
            {"nombre": "Queso", "es_removible": True},
            {"nombre": "Lechuga", "es_removible": True},
            {"nombre": "Tomate", "es_removible": True},
        ],
    },
    {
        "nombre": "Pizza Muzzarella",
        "descripcion": "Clásica con mozzarella",
        "precio_base": Decimal("4200.00"),
        "stock_cantidad": 15,
        "disponible": True,
        "imagenes_url": ["https://images.unsplash.com/photo-1548365328-9f547f3c07b6"],
        "categorias": ["Comidas", "Pizzas"],
        "ingredientes": [
            {"nombre": "Harina", "es_removible": False},
            {"nombre": "Queso", "es_removible": False},
            {"nombre": "Tomate", "es_removible": False},
        ],
    },
    {
        "nombre": "Ensalada César",
        "descripcion": "Lechuga, pollo y aderezo",
        "precio_base": Decimal("2800.00"),
        "stock_cantidad": 18,
        "disponible": True,
        "imagenes_url": ["https://images.unsplash.com/photo-1540420773420-3366772f4999"],
        "categorias": ["Ensaladas"],
        "ingredientes": [
            {"nombre": "Lechuga", "es_removible": False},
            {"nombre": "Pollo", "es_removible": True},
            {"nombre": "Queso", "es_removible": True},
        ],
    },
    {
        "nombre": "Limonada",
        "descripcion": "Refrescante y natural",
        "precio_base": Decimal("1400.00"),
        "stock_cantidad": 40,
        "disponible": True,
        "imagenes_url": ["https://images.unsplash.com/photo-1497534446932-c925b458314e"],
        "categorias": ["Bebidas", "Jugos"],
        "ingredientes": [
            {"nombre": "Azúcar", "es_removible": True},
        ],
    },
    {
        "nombre": "Brownie",
        "descripcion": "Chocolate intenso",
        "precio_base": Decimal("2200.00"),
        "stock_cantidad": 12,
        "disponible": True,
        "imagenes_url": ["https://images.unsplash.com/photo-1509042239860-f550ce710b93"],
        "categorias": ["Postres", "Tortas"],
        "ingredientes": [
            {"nombre": "Chocolate", "es_removible": False},
            {"nombre": "Harina", "es_removible": False},
            {"nombre": "Huevo", "es_removible": False},
        ],
    },
    {
        "nombre": "Sándwich de Pollo",
        "descripcion": "Pollo, lechuga y mayonesa",
        "precio_base": Decimal("2600.00"),
        "stock_cantidad": 20,
        "disponible": True,
        "imagenes_url": ["https://images.unsplash.com/photo-1508736793122-f516e3ba5569"],
        "categorias": ["Sándwiches"],
        "ingredientes": [
            {"nombre": "Pollo", "es_removible": False},
            {"nombre": "Pan", "es_removible": False},
            {"nombre": "Lechuga", "es_removible": True},
            {"nombre": "Mayonesa", "es_removible": True},
        ],
    },
    {
        "nombre": "Café Americano",
        "descripcion": "Café negro clásico",
        "precio_base": Decimal("1200.00"),
        "stock_cantidad": 50,
        "disponible": True,
        "imagenes_url": ["https://images.unsplash.com/photo-1495474472287-4d71bcdd2085"],
        "categorias": ["Cafetería"],
        "ingredientes": [
            {"nombre": "Azúcar", "es_removible": True},
        ],
    },
    {
        "nombre": "Capuccino",
        "descripcion": "Café con leche espumada",
        "precio_base": Decimal("1800.00"),
        "stock_cantidad": 35,
        "disponible": True,
        "imagenes_url": ["https://images.unsplash.com/photo-1509042239860-f550ce710b93"],
        "categorias": ["Cafetería"],
        "ingredientes": [
            {"nombre": "Leche", "es_removible": False},
            {"nombre": "Azúcar", "es_removible": True},
        ],
    },
    {
        "nombre": "Papas con Cheddar",
        "descripcion": "Papas con salsa de queso",
        "precio_base": Decimal("2400.00"),
        "stock_cantidad": 22,
        "disponible": True,
        "imagenes_url": ["https://images.unsplash.com/photo-1504674900247-0877df9cc836"],
        "categorias": ["Entradas"],
        "ingredientes": [
            {"nombre": "Queso", "es_removible": False},
            {"nombre": "Sal", "es_removible": True},
        ],
    },
    {
        "nombre": "Ensalada Vegana",
        "descripcion": "Vegetales frescos",
        "precio_base": Decimal("2600.00"),
        "stock_cantidad": 14,
        "disponible": True,
        "imagenes_url": ["https://images.unsplash.com/photo-1512621776951-a57141f2eefd"],
        "categorias": ["Ensaladas", "Vegano"],
        "ingredientes": [
            {"nombre": "Lechuga", "es_removible": False},
            {"nombre": "Tomate", "es_removible": True},
            {"nombre": "Cebolla", "es_removible": True},
            {"nombre": "Pimiento", "es_removible": True},
        ],
    },
    {
        "nombre": "Pizza Vegetariana",
        "descripcion": "Con vegetales y mozzarella",
        "precio_base": Decimal("4500.00"),
        "stock_cantidad": 10,
        "disponible": True,
        "imagenes_url": ["https://images.unsplash.com/photo-1548365328-9f547f3c07b6"],
        "categorias": ["Comidas", "Pizzas"],
        "ingredientes": [
            {"nombre": "Harina", "es_removible": False},
            {"nombre": "Queso", "es_removible": False},
            {"nombre": "Champiñones", "es_removible": True},
            {"nombre": "Pimiento", "es_removible": True},
        ],
    },
    {
        "nombre": "Hamburguesa BBQ",
        "descripcion": "Carne con bacon y salsa",
        "precio_base": Decimal("3600.00"),
        "stock_cantidad": 16,
        "disponible": True,
        "imagenes_url": ["https://images.unsplash.com/photo-1550547660-d9450f859349"],
        "categorias": ["Comidas", "Hamburguesas"],
        "ingredientes": [
            {"nombre": "Carne vacuna", "es_removible": False},
            {"nombre": "Bacon", "es_removible": False},
            {"nombre": "Queso", "es_removible": True},
            {"nombre": "Cebolla", "es_removible": True},
            {"nombre": "Ketchup", "es_removible": True},
        ],
    },
    {
        "nombre": "Pasta Alfredo",
        "descripcion": "Salsa cremosa con queso",
        "precio_base": Decimal("3800.00"),
        "stock_cantidad": 13,
        "disponible": True,
        "imagenes_url": ["https://images.unsplash.com/photo-1473093295043-cdd812d0e601"],
        "categorias": ["Pastas"],
        "ingredientes": [
            {"nombre": "Queso", "es_removible": False},
            {"nombre": "Leche", "es_removible": False},
            {"nombre": "Ajo", "es_removible": True},
        ],
    },
]


def run() -> None:
    print("=== Seed — Seguridad JWT (PostgreSQL) ===")
    create_all_tables()

    with Session(engine) as session:
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

        session.commit()

        for data in CATEGORIAS_INICIALES:
            existing = session.exec(
                select(Categoria).where(Categoria.nombre == data["nombre"])
            ).first()

            if existing:
                print(f"  [=] Ya existe categoría: {data['nombre']}")
                continue

            categoria = Categoria(
                nombre=data["nombre"],
                descripcion=data.get("descripcion"),
            )
            session.add(categoria)
            session.flush()

            for sub in data.get("subcategorias", []):
                existing_sub = session.exec(
                    select(Categoria).where(Categoria.nombre == sub["nombre"])
                ).first()
                if existing_sub:
                    continue
                session.add(
                    Categoria(
                        nombre=sub["nombre"],
                        descripcion=sub.get("descripcion"),
                        parent_id=categoria.id,
                    )
                )

        session.commit()

        for data in INGREDIENTES_INICIALES:
            existing = session.exec(
                select(Ingrediente).where(Ingrediente.nombre == data["nombre"])
            ).first()

            if existing:
                print(f"  [=] Ya existe ingrediente: {data['nombre']}")
                continue

            ingrediente = Ingrediente(
                nombre=data["nombre"],
                descripcion=data.get("descripcion"),
                es_alergeno=data.get("es_alergeno", False),
            )
            session.add(ingrediente)

        session.commit()

        categorias_por_nombre = {
            cat.nombre: cat
            for cat in session.exec(select(Categoria)).all()
        }
        ingredientes_por_nombre = {
            ing.nombre: ing
            for ing in session.exec(select(Ingrediente)).all()
        }

        for data in PRODUCTOS_INICIALES:
            existing = session.exec(
                select(Producto).where(Producto.nombre == data["nombre"])
            ).first()

            if existing:
                print(f"  [=] Ya existe producto: {data['nombre']}")
                continue

            producto = Producto(
                nombre=data["nombre"],
                descripcion=data.get("descripcion"),
                precio_base=data["precio_base"],
                imagenes_url=data.get("imagenes_url"),
                stock_cantidad=data.get("stock_cantidad", 0),
                disponible=data.get("disponible", True),
            )
            session.add(producto)
            session.flush()

            for cat_nombre in data.get("categorias", []):
                categoria = categorias_por_nombre.get(cat_nombre)
                if not categoria:
                    continue
                session.add(ProductoCategoria(
                    producto_id=producto.id,
                    categoria_id=categoria.id,
                ))

            for ing_data in data.get("ingredientes", []):
                ingrediente = ingredientes_por_nombre.get(ing_data["nombre"])
                if not ingrediente:
                    continue
                session.add(ProductoIngrediente(
                    producto_id=producto.id,
                    ingrediente_id=ingrediente.id,
                    es_removible=ing_data.get("es_removible", False),
                ))

        session.commit()

    print("\nUsuarios disponibles para pruebas:")
    print("  admin / Admin1234!  → role=admin  (acceso total)")
    print("  juan  / Juan1234!   → role=user   (acceso básico)")
    print("\nCategorías iniciales cargadas:")
    print("  10 categorías raíz (al menos 3 con subcategorías)")
    print("Ingredientes iniciales cargados:")
    print(f"  {len(INGREDIENTES_INICIALES)} ingredientes")
    print("Productos iniciales cargados:")
    print(f"  {len(PRODUCTOS_INICIALES)} productos")
    print()


if __name__ == "__main__":
    run()
