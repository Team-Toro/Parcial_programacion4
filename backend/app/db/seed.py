"""
Script de seed — carga datos iniciales para pruebas.
Idempotente: se puede ejecutar múltiples veces sin duplicar datos.

Uso:
    python -m app.db.seed

Requiere PostgreSQL corriendo con las variables de .env configuradas.
"""

import uuid
from sqlmodel import Session, select
from decimal import Decimal
from app.core.database import engine, create_all_tables
from app.core.security import hash_password
from app.usuarios.model import Rol, Usuario, UsuarioRol
from app.categorias.model import Categoria
from app.ingredientes.model import Ingrediente, UnidadMedida
from app.productos.model import Producto, ProductoCategoria, ProductoIngrediente
from app.formas_pago.model import FormaPago
from app.estados_pedido.model import EstadoPedido
from app.direcciones.model import DireccionEntrega
from app.pedidos.model import Pedido, DetallePedido, HistorialEstadoPedido
from app.pagos.model import Pago


FORMAS_PAGO_INICIALES = [
    {"codigo": "MERCADOPAGO",   "descripcion": "Mercado Pago Checkout API",      "habilitado": True},
    {"codigo": "EFECTIVO",      "descripcion": "Pago en local al retirar",        "habilitado": True},
    {"codigo": "TRANSFERENCIA", "descripcion": "Transferencia bancaria",          "habilitado": True},
]

ESTADOS_PEDIDO_INICIALES = [
    {"codigo": "PENDIENTE",  "descripcion": "Recién creado, esperando confirmación", "orden": 1, "es_terminal": False},
    {"codigo": "CONFIRMADO", "descripcion": "Pago confirmado",                        "orden": 2, "es_terminal": False},
    {"codigo": "EN_PREP",    "descripcion": "En preparación",                         "orden": 3, "es_terminal": False},
    {"codigo": "EN_CAMINO",  "descripcion": "Saliendo a entregarse",                  "orden": 4, "es_terminal": False},
    {"codigo": "ENTREGADO",  "descripcion": "Entregado al cliente",                   "orden": 5, "es_terminal": True},
    {"codigo": "CANCELADO",  "descripcion": "Cancelado",                              "orden": 5, "es_terminal": True},
]

ROLES_INICIALES = [
    {
        "codigo": "ADMIN",
        "nombre": "Administrador",
        "description": "Acceso total sin restricciones",
    },
    {
        "codigo": "STOCK",
        "nombre": "Stock",
        "description": "Actualiza stock y disponible",
    },
    {
        "codigo": "PEDIDOS",
        "nombre": "Pedidos",
        "description": "Avanza estados CONFIRMADO->ENTREGADO",
    },
    {
        "codigo": "CLIENTE",
        "nombre": "Cliente",
        "description": "Opera solo sus propios datos",
    },
]

USUARIOS_INICIALES = [
    {
        "first_name": "Administrador",
        "last_name": "Del Sistema",
        "email": "admin@example.com",
        "celular": "1133334444",
        "password": "Admin1234!",
        "roles": ["ADMIN"],
    },
    {
        "first_name": "Juan",
        "last_name": "Perez",
        "email": "juan@example.com",
        "celular": "1144445555",
        "password": "Juan1234!",
        "roles": ["CLIENTE"],
    },
    {
        "first_name": "Sofia",
        "last_name": "Lopez",
        "email": "sofia.stock@example.com",
        "celular": "1155556666",
        "password": "Sofia1234!",
        "roles": ["STOCK"],
    },
    {
        "first_name": "Marcos",
        "last_name": "Diaz",
        "email": "marcos.pedidos@example.com",
        "celular": "1166667777",
        "password": "Marcos1234!",
        "roles": ["PEDIDOS"],
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
    {"nombre": "Entradas",    "descripcion": "Para abrir el apetito"},
    {"nombre": "Ensaladas",   "descripcion": "Opciones frescas"},
    {"nombre": "Pastas",      "descripcion": "Caseras y rellenas"},
    {"nombre": "Sándwiches",  "descripcion": "Rápidos y sabrosos"},
    {"nombre": "Cafetería",   "descripcion": "Café y acompañamientos"},
    {"nombre": "Vegano",      "descripcion": "Opciones sin productos animales"},
    {"nombre": "Sin gluten",  "descripcion": "Opciones aptas celíacos"},
]

INGREDIENTES_INICIALES = [
    {"nombre": "Harina",        "descripcion": "Harina de trigo 000",    "es_alergeno": True,  "unidad": UnidadMedida.KG,     "stock_actual": 50.0},
    {"nombre": "Leche",         "descripcion": "Leche entera",            "es_alergeno": True,  "unidad": UnidadMedida.LITRO,  "stock_actual": 30.0},
    {"nombre": "Queso",         "descripcion": "Queso mozzarella",        "es_alergeno": True,  "unidad": UnidadMedida.KG,     "stock_actual": 10.0},
    {"nombre": "Tomate",        "descripcion": "Tomate fresco",           "es_alergeno": False, "unidad": UnidadMedida.KG,     "stock_actual": 25.0},
    {"nombre": "Lechuga",       "descripcion": "Lechuga mantecosa",       "es_alergeno": False, "unidad": UnidadMedida.KG,     "stock_actual": 15.0},
    {"nombre": "Cebolla",       "descripcion": "Cebolla morada",          "es_alergeno": False, "unidad": UnidadMedida.KG,     "stock_actual": 10.0},
    {"nombre": "Pollo",         "descripcion": "Pechuga de pollo",        "es_alergeno": False, "unidad": UnidadMedida.KG,     "stock_actual": 20.0},
    {"nombre": "Carne vacuna",  "descripcion": "Carne de res",            "es_alergeno": False, "unidad": UnidadMedida.KG,     "stock_actual": 25.0},
    {"nombre": "Huevo",         "descripcion": "Huevo de gallina",        "es_alergeno": True,  "unidad": UnidadMedida.UNIDAD, "stock_actual": 200.0},
    {"nombre": "Azúcar",        "descripcion": "Azúcar blanca",           "es_alergeno": False, "unidad": UnidadMedida.KG,     "stock_actual": 20.0},
    {"nombre": "Chocolate",     "descripcion": "Cacao y azúcar",          "es_alergeno": True,  "unidad": UnidadMedida.KG,     "stock_actual": 8.0},
    {"nombre": "Pan",           "descripcion": "Pan artesanal",           "es_alergeno": True,  "unidad": UnidadMedida.KG,     "stock_actual": 15.0},
    {"nombre": "Sal",           "descripcion": "Sal fina",                "es_alergeno": False, "unidad": UnidadMedida.KG,     "stock_actual": 5.0},
    {"nombre": "Pimienta",      "descripcion": "Pimienta negra",          "es_alergeno": False, "unidad": UnidadMedida.KG,     "stock_actual": 2.0},
    {"nombre": "Aceite de oliva","descripcion": "Oliva extra virgen",     "es_alergeno": False, "unidad": UnidadMedida.LITRO,  "stock_actual": 10.0},
    {"nombre": "Ajo",           "descripcion": "Ajo fresco",              "es_alergeno": False, "unidad": UnidadMedida.KG,     "stock_actual": 3.0},
    {"nombre": "Perejil",       "descripcion": "Hierba fresca",           "es_alergeno": False, "unidad": UnidadMedida.KG,     "stock_actual": 2.0},
    {"nombre": "Jamón",         "descripcion": "Jamón cocido",            "es_alergeno": False, "unidad": UnidadMedida.KG,     "stock_actual": 8.0},
    {"nombre": "Bacon",         "descripcion": "Panceta ahumada",         "es_alergeno": False, "unidad": UnidadMedida.KG,     "stock_actual": 6.0},
    {"nombre": "Champiñones",   "descripcion": "Frescos laminados",       "es_alergeno": False, "unidad": UnidadMedida.KG,     "stock_actual": 8.0},
    {"nombre": "Pimiento",      "descripcion": "Pimiento rojo",           "es_alergeno": False, "unidad": UnidadMedida.KG,     "stock_actual": 10.0},
    {"nombre": "Mayonesa",      "descripcion": "Salsa de huevo",          "es_alergeno": True,  "unidad": UnidadMedida.KG,     "stock_actual": 5.0},
    {"nombre": "Ketchup",       "descripcion": "Salsa de tomate",         "es_alergeno": False, "unidad": UnidadMedida.KG,     "stock_actual": 5.0},
    {"nombre": "Mostaza",       "descripcion": "Salsa de mostaza",        "es_alergeno": True,  "unidad": UnidadMedida.KG,     "stock_actual": 3.0},
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
            {"nombre": "Carne vacuna", "es_removible": False, "cantidad": 0.15},
            {"nombre": "Queso",        "es_removible": True,  "cantidad": 0.03},
            {"nombre": "Lechuga",      "es_removible": True,  "cantidad": 0.02},
            {"nombre": "Tomate",       "es_removible": True,  "cantidad": 0.03},
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
            {"nombre": "Harina", "es_removible": False, "cantidad": 0.4},
            {"nombre": "Queso",  "es_removible": False, "cantidad": 0.25},
            {"nombre": "Tomate", "es_removible": False, "cantidad": 0.15},
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
            {"nombre": "Lechuga", "es_removible": False, "cantidad": 0.1},
            {"nombre": "Pollo",   "es_removible": True,  "cantidad": 0.15},
            {"nombre": "Queso",   "es_removible": True,  "cantidad": 0.03},
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
            {"nombre": "Azúcar", "es_removible": True, "cantidad": 0.02},
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
            {"nombre": "Chocolate", "es_removible": False, "cantidad": 0.08},
            {"nombre": "Harina",    "es_removible": False, "cantidad": 0.1},
            {"nombre": "Huevo",     "es_removible": False, "cantidad": 2.0},
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
            {"nombre": "Pollo",    "es_removible": False, "cantidad": 0.15},
            {"nombre": "Pan",      "es_removible": False, "cantidad": 0.12},
            {"nombre": "Lechuga",  "es_removible": True,  "cantidad": 0.02},
            {"nombre": "Mayonesa", "es_removible": True,  "cantidad": 0.02},
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
            {"nombre": "Azúcar", "es_removible": True, "cantidad": 0.01},
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
            {"nombre": "Leche",  "es_removible": False, "cantidad": 0.15},
            {"nombre": "Azúcar", "es_removible": True,  "cantidad": 0.01},
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
            {"nombre": "Queso", "es_removible": False, "cantidad": 0.05},
            {"nombre": "Sal",   "es_removible": True,  "cantidad": 0.005},
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
            {"nombre": "Lechuga",  "es_removible": False, "cantidad": 0.1},
            {"nombre": "Tomate",   "es_removible": True,  "cantidad": 0.05},
            {"nombre": "Cebolla",  "es_removible": True,  "cantidad": 0.03},
            {"nombre": "Pimiento", "es_removible": True,  "cantidad": 0.04},
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
            {"nombre": "Harina",      "es_removible": False, "cantidad": 0.4},
            {"nombre": "Queso",       "es_removible": False, "cantidad": 0.25},
            {"nombre": "Champiñones", "es_removible": True,  "cantidad": 0.08},
            {"nombre": "Pimiento",    "es_removible": True,  "cantidad": 0.05},
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
            {"nombre": "Carne vacuna", "es_removible": False, "cantidad": 0.15},
            {"nombre": "Bacon",        "es_removible": False, "cantidad": 0.05},
            {"nombre": "Queso",        "es_removible": True,  "cantidad": 0.03},
            {"nombre": "Cebolla",      "es_removible": True,  "cantidad": 0.03},
            {"nombre": "Ketchup",      "es_removible": True,  "cantidad": 0.02},
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
            {"nombre": "Queso", "es_removible": False, "cantidad": 0.08},
            {"nombre": "Leche", "es_removible": False, "cantidad": 0.15},
            {"nombre": "Ajo",   "es_removible": True,  "cantidad": 0.01},
        ],
    },
]


def run() -> None:
    print("=== Seed — Food Store (PostgreSQL) ===")
    create_all_tables()

    cats_creadas = 0
    ings_creados = 0
    prods_creados = 0

    with Session(engine) as session:
        # Roles
        print("\n[Roles]")
        for data in ROLES_INICIALES:
            existing = session.exec(
                select(Rol).where(Rol.codigo == data["codigo"])
            ).first()
            if existing:
                print(f"  [=] Ya existe: {data['codigo']}")
            else:
                session.add(Rol(
                    codigo=data["codigo"],
                    nombre=data["nombre"],
                    description=data["description"],
                ))
                print(f"  [+] Creado: {data['codigo']}")
        session.commit()

        # Formas de Pago
        print("\n[Formas de Pago]")
        for data in FORMAS_PAGO_INICIALES:
            existing = session.exec(
                select(FormaPago).where(FormaPago.codigo == data["codigo"])
            ).first()
            if existing:
                print(f"  [=] Ya existe: {data['codigo']}")
            else:
                session.add(FormaPago(
                    codigo=data["codigo"],
                    descripcion=data["descripcion"],
                    habilitado=data["habilitado"],
                ))
                print(f"  [+] Creado: {data['codigo']}")
        session.commit()

        # Estados de Pedido
        print("\n[Estados de Pedido]")
        for data in ESTADOS_PEDIDO_INICIALES:
            existing = session.exec(
                select(EstadoPedido).where(EstadoPedido.codigo == data["codigo"])
            ).first()
            if existing:
                print(f"  [=] Ya existe: {data['codigo']}")
            else:
                session.add(EstadoPedido(
                    codigo=data["codigo"],
                    descripcion=data["descripcion"],
                    orden=data["orden"],
                    es_terminal=data["es_terminal"],
                ))
                print(f"  [+] Creado: {data['codigo']}")
        session.commit()

        # Usuarios
        print("\n[Usuarios]")
        for data in USUARIOS_INICIALES:
            existing = session.exec(
                select(Usuario).where(Usuario.email == data["email"])
            ).first()
            if existing:
                print(f"  [=] Ya existe: {data['email']}")
            else:
                session.add(Usuario(
                    first_name      = data["first_name"],
                    last_name       = data["last_name"],
                    email           = data["email"],
                    celular         = data["celular"],
                    hashed_password = hash_password(data["password"]),
                ))
                print(f"  [+] Creado: {data['email']} / {data['password']}")
        session.commit()

        # Roles por usuario
        print("\n[UsuarioRol]")
        for data in USUARIOS_INICIALES:
            user = session.exec(
                select(Usuario).where(Usuario.email == data["email"])
            ).first()
            if not user:
                continue
            for role_code in data.get("roles", []):
                existing_role = session.exec(
                    select(UsuarioRol).where(
                        (UsuarioRol.usuario_id == user.id)
                        & (UsuarioRol.role_id == role_code)
                    )
                ).first()
                if existing_role:
                    print(f"  [=] Ya existe: {user.email} -> {role_code}")
                    continue
                session.add(UsuarioRol(
                    usuario_id=user.id,
                    role_id=role_code,
                    assigned_by=None,
                    expires_at=None,
                ))
                print(f"  [+] Asignado: {user.email} -> {role_code}")
        session.commit()

        # Categorías
        print("\n[Categorías]")
        for data in CATEGORIAS_INICIALES:
            existing = session.exec(
                select(Categoria).where(Categoria.nombre == data["nombre"])
            ).first()
            if existing:
                print(f"  [=] Ya existe: {data['nombre']}")
                continue

            cat = Categoria(nombre=data["nombre"], descripcion=data.get("descripcion"))
            session.add(cat)
            session.flush()
            cats_creadas += 1
            print(f"  [+] Creado: {data['nombre']}")

            for sub in data.get("subcategorias", []):
                existing_sub = session.exec(
                    select(Categoria).where(Categoria.nombre == sub["nombre"])
                ).first()
                if not existing_sub:
                    session.add(Categoria(
                        nombre      = sub["nombre"],
                        descripcion = sub.get("descripcion"),
                        parent_id   = cat.id,
                    ))
                    cats_creadas += 1
                    print(f"    [+] Subcategoría: {sub['nombre']}")
        session.commit()

        # Ingredientes
        print("\n[Ingredientes]")
        for data in INGREDIENTES_INICIALES:
            existing = session.exec(
                select(Ingrediente).where(Ingrediente.nombre == data["nombre"])
            ).first()
            if existing:
                print(f"  [=] Ya existe: {data['nombre']}")
                continue

            session.add(Ingrediente(
                nombre      = data["nombre"],
                descripcion = data.get("descripcion"),
                es_alergeno = data.get("es_alergeno", False),
                unidad      = data["unidad"],
                stock_actual= data["stock_actual"],
            ))
            ings_creados += 1
            print(f"  [+] Creado: {data['nombre']} ({data['stock_actual']} {data['unidad'].value})")
        session.commit()

        # Mapas para lookup rápido
        categorias_por_nombre = {
            cat.nombre: cat
            for cat in session.exec(select(Categoria)).all()
        }
        ingredientes_por_nombre = {
            ing.nombre: ing
            for ing in session.exec(select(Ingrediente)).all()
        }

        # Productos
        print("\n[Productos]")
        for data in PRODUCTOS_INICIALES:
            existing = session.exec(
                select(Producto).where(Producto.nombre == data["nombre"])
            ).first()
            if existing:
                print(f"  [=] Ya existe: {data['nombre']}")
                continue

            producto = Producto(
                nombre        = data["nombre"],
                descripcion   = data.get("descripcion"),
                precio_base   = data["precio_base"],
                imagenes_url  = data.get("imagenes_url"),
                stock_cantidad= data.get("stock_cantidad", 0),
                disponible    = data.get("disponible", True),
            )
            session.add(producto)
            session.flush()

            for cat_nombre in data.get("categorias", []):
                cat = categorias_por_nombre.get(cat_nombre)
                if cat:
                    session.add(ProductoCategoria(
                        producto_id  = producto.id,
                        categoria_id = cat.id,
                    ))

            for ing_data in data.get("ingredientes", []):
                ing = ingredientes_por_nombre.get(ing_data["nombre"])
                if ing:
                    session.add(ProductoIngrediente(
                        producto_id    = producto.id,
                        ingrediente_id = ing.id,
                        es_removible   = ing_data.get("es_removible", False),
                        cantidad       = ing_data.get("cantidad", 1.0),
                    ))

            prods_creados += 1
            print(f"  [+] Creado: {data['nombre']} (${data['precio_base']})")
        session.commit()

        # --- Seed de muestra: direcciones + pedidos + pagos de Juan ---
        juan = session.exec(select(Usuario).where(Usuario.email == "juan@example.com")).first()
        if not juan:
            print("\n[!] juan@example.com no encontrado, saltando seed de direcciones/pedidos")
        else:
            # Direcciones
            print("\n[Direcciones de Juan]")
            dirs_existentes = session.exec(
                select(DireccionEntrega).where(DireccionEntrega.usuario_id == juan.id)
            ).all()
            if dirs_existentes:
                print(f"  [=] Ya existen {len(dirs_existentes)} direcciones para juan")
            else:
                casa = DireccionEntrega(
                    usuario_id=juan.id, alias="Casa",
                    linea1="Av. San Martín 1234", ciudad="Mendoza", provincia="Mendoza",
                    es_principal=True,
                )
                session.add(casa)
                session.add(DireccionEntrega(
                    usuario_id=juan.id, alias="Trabajo",
                    linea1="Belgrano 567", ciudad="Godoy Cruz", provincia="Mendoza",
                    es_principal=False,
                ))
                session.flush()
                print("  [+] Creadas: Casa (principal), Trabajo")
            session.commit()

            # Pedidos de muestra
            print("\n[Pedidos de Juan]")
            pedidos_existentes = session.exec(
                select(Pedido).where(Pedido.usuario_id == juan.id)
            ).all()
            if pedidos_existentes:
                print(f"  [=] Ya existen {len(pedidos_existentes)} pedidos para juan")
            else:
                hamburguesa = session.exec(
                    select(Producto).where(Producto.nombre == "Hamburguesa Clásica")
                ).first()
                limonada = session.exec(
                    select(Producto).where(Producto.nombre == "Limonada")
                ).first()
                dir_casa = session.exec(
                    select(DireccionEntrega)
                    .where(DireccionEntrega.usuario_id == juan.id)
                    .where(DireccionEntrega.es_principal == True)  # noqa: E712
                ).first()

                if not hamburguesa or not limonada or not dir_casa:
                    print("  [!] Productos o dirección no encontrados, saltando seed de pedidos")
                else:
                    dir_id = dir_casa.id
                    costo_envio = Decimal("500.00")

                    # Pedido 1: EFECTIVO → ENTREGADO
                    p1 = Pedido(
                        usuario_id=juan.id, direccion_id=None,
                        estado_codigo="ENTREGADO", forma_pago_codigo="EFECTIVO",
                        subtotal=hamburguesa.precio_base, descuento=Decimal("0.00"),
                        costo_envio=Decimal("0.00"), total=hamburguesa.precio_base,
                    )
                    session.add(p1)
                    session.flush()
                    session.add(DetallePedido(
                        pedido_id=p1.id, producto_id=hamburguesa.id, cantidad=1,
                        nombre_snapshot=hamburguesa.nombre,
                        precio_snapshot=hamburguesa.precio_base,
                        subtotal_snap=hamburguesa.precio_base,
                    ))
                    for desde, hacia in [
                        (None, "PENDIENTE"), ("PENDIENTE", "CONFIRMADO"),
                        ("CONFIRMADO", "EN_PREP"), ("EN_PREP", "EN_CAMINO"),
                        ("EN_CAMINO", "ENTREGADO"),
                    ]:
                        session.add(HistorialEstadoPedido(
                            pedido_id=p1.id, estado_desde=desde, estado_hacia=hacia,
                            usuario_id=juan.id if hacia == "PENDIENTE" else None,
                        ))
                    print("  [+] Pedido 1: EFECTIVO → ENTREGADO")

                    # Pedido 2: MERCADOPAGO → CONFIRMADO
                    sub2 = hamburguesa.precio_base + limonada.precio_base
                    p2 = Pedido(
                        usuario_id=juan.id, direccion_id=dir_id,
                        estado_codigo="CONFIRMADO", forma_pago_codigo="MERCADOPAGO",
                        subtotal=sub2, descuento=Decimal("0.00"),
                        costo_envio=costo_envio, total=sub2 + costo_envio,
                    )
                    session.add(p2)
                    session.flush()
                    for prod, qty in [(hamburguesa, 1), (limonada, 1)]:
                        session.add(DetallePedido(
                            pedido_id=p2.id, producto_id=prod.id, cantidad=qty,
                            nombre_snapshot=prod.nombre, precio_snapshot=prod.precio_base,
                            subtotal_snap=prod.precio_base * qty,
                        ))
                    for desde, hacia in [(None, "PENDIENTE"), ("PENDIENTE", "CONFIRMADO")]:
                        session.add(HistorialEstadoPedido(
                            pedido_id=p2.id, estado_desde=desde, estado_hacia=hacia,
                            usuario_id=juan.id if hacia == "PENDIENTE" else None,
                        ))
                    session.add(Pago(
                        pedido_id=p2.id, mp_status="approved", mp_payment_id=123456,
                        external_reference=str(uuid.uuid4()), idempotency_key=str(uuid.uuid4()),
                        transaction_amount=p2.total, payment_method_id="credit_card",
                    ))
                    print("  [+] Pedido 2: MERCADOPAGO → CONFIRMADO (pago approved)")

                    # Pedido 3: TRANSFERENCIA → PENDIENTE
                    sub3 = limonada.precio_base * 2
                    p3 = Pedido(
                        usuario_id=juan.id, direccion_id=dir_id,
                        estado_codigo="PENDIENTE", forma_pago_codigo="TRANSFERENCIA",
                        subtotal=sub3, descuento=Decimal("0.00"),
                        costo_envio=costo_envio, total=sub3 + costo_envio,
                    )
                    session.add(p3)
                    session.flush()
                    session.add(DetallePedido(
                        pedido_id=p3.id, producto_id=limonada.id, cantidad=2,
                        nombre_snapshot=limonada.nombre, precio_snapshot=limonada.precio_base,
                        subtotal_snap=sub3,
                    ))
                    session.add(HistorialEstadoPedido(
                        pedido_id=p3.id, estado_desde=None, estado_hacia="PENDIENTE",
                        usuario_id=juan.id,
                    ))
                    print("  [+] Pedido 3: TRANSFERENCIA → PENDIENTE")

                    # Pedido 4: MERCADOPAGO → CANCELADO
                    sub4 = hamburguesa.precio_base
                    p4 = Pedido(
                        usuario_id=juan.id, direccion_id=dir_id,
                        estado_codigo="CANCELADO", forma_pago_codigo="MERCADOPAGO",
                        subtotal=sub4, descuento=Decimal("0.00"),
                        costo_envio=costo_envio, total=sub4 + costo_envio,
                    )
                    session.add(p4)
                    session.flush()
                    session.add(DetallePedido(
                        pedido_id=p4.id, producto_id=hamburguesa.id, cantidad=1,
                        nombre_snapshot=hamburguesa.nombre,
                        precio_snapshot=hamburguesa.precio_base,
                        subtotal_snap=sub4,
                    ))
                    for desde, hacia, motivo in [
                        (None, "PENDIENTE", None),
                        ("PENDIENTE", "CANCELADO", "El cliente canceló el pedido"),
                    ]:
                        session.add(HistorialEstadoPedido(
                            pedido_id=p4.id, estado_desde=desde, estado_hacia=hacia,
                            usuario_id=juan.id, motivo=motivo,
                        ))
                    session.add(Pago(
                        pedido_id=p4.id, mp_status="cancelled",
                        external_reference=str(uuid.uuid4()), idempotency_key=str(uuid.uuid4()),
                        transaction_amount=p4.total,
                    ))
                    print("  [+] Pedido 4: MERCADOPAGO → CANCELADO")

                    session.flush()
            session.commit()

    print("\n=== Seed completado ===")
    print(f"  Categorías creadas : {cats_creadas}")
    print(f"  Ingredientes creados: {ings_creados}")
    print(f"  Productos creados  : {prods_creados}")
    print("\nUsuarios:")
    print("  admin@example.com / Admin1234!  → roles=[ADMIN]")
    print("  juan@example.com  / Juan1234!   → roles=[CLIENTE]")
    print("  sofia.stock@example.com  / Sofia1234!  → roles=[STOCK]")
    print("  marcos.pedidos@example.com / Marcos1234! → roles=[PEDIDOS]")
    print()


if __name__ == "__main__":
    run()
