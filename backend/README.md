# 🍽️ Food Store — Backend

API REST para la gestión de productos, categorías e ingredientes de un negocio gastronómico.

![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=flat&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=flat&logo=postgresql&logoColor=white)
![SQLModel](https://img.shields.io/badge/SQLModel-0.0.19+-FF6B6B?style=flat)

---

## Tecnologías

| Tecnología | Versión |
|------------|---------|
| Python | 3.11+ |
| FastAPI | 0.111+ |
| SQLModel | 0.0.19+ |
| Pydantic | 2.7+ |
| PostgreSQL | 17 |
| psycopg2-binary | 2.9.9+ |
| uvicorn | 0.29+ |
| python-dotenv | 1.0+ |

---

## Requisitos previos

Antes de comenzar, asegurate de tener instalado:

- **Python 3.11+** — [python.org/downloads](https://www.python.org/downloads/)
- **PostgreSQL 17** — [postgresql.org/download](https://www.postgresql.org/download/)
- **Git** — [git-scm.com](https://git-scm.com/)

---

## Instalación paso a paso

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd food-store/backend
```

### 2. Crear el entorno virtual

```bash
python -m venv .venv
```

### 3. Activar el entorno virtual

**Windows:**
```bash
.venv\Scripts\activate
```

**Mac / Linux:**
```bash
source .venv/bin/activate
```

### 4. Instalar las dependencias

```bash
pip install -r requirements.txt
```

### 5. Crear el archivo de variables de entorno

```bash
cp env.example .env
```

### 6. Configurar la variable DATABASE_URL

Abrí el archivo `.env` y reemplazá `TU_PASSWORD` con la contraseña de tu usuario de PostgreSQL:

```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/food_store
```

### 7. Crear la base de datos en PostgreSQL

Conectate a `psql` y ejecutá:

```sql
CREATE DATABASE food_store;
```

O desde la terminal:

```bash
psql -U postgres -c "CREATE DATABASE food_store;"
```

### 8. Levantar el servidor

```bash
uvicorn app.main:app --reload
```

El servidor estará disponible en: **http://localhost:8000**
Documentación interactiva (Swagger): **http://localhost:8000/docs**

---

## Endpoints disponibles

### Categorías

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/categorias/` | Lista todas las categorías |
| `GET` | `/categorias/{id}` | Obtiene una categoría por ID |
| `POST` | `/categorias/` | Crea una nueva categoría |
| `PATCH` | `/categorias/{id}` | Actualiza parcialmente una categoría |
| `DELETE` | `/categorias/{id}` | Elimina una categoría |

### Ingredientes

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/ingredientes/` | Lista todos los ingredientes |
| `GET` | `/ingredientes/{id}` | Obtiene un ingrediente por ID |
| `POST` | `/ingredientes/` | Crea un nuevo ingrediente |
| `PATCH` | `/ingredientes/{id}` | Actualiza parcialmente un ingrediente |
| `DELETE` | `/ingredientes/{id}` | Elimina un ingrediente |

### Productos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/productos/` | Lista todos los productos (soporta filtro `?disponible=true`) |
| `GET` | `/productos/{id}` | Obtiene un producto por ID con categorías e ingredientes |
| `POST` | `/productos/` | Crea un nuevo producto con relaciones N:N |
| `PATCH` | `/productos/{id}` | Actualiza parcialmente un producto |
| `DELETE` | `/productos/{id}` | Elimina un producto y sus relaciones |

---

## Estructura del proyecto

```
backend/
├── app/
│   ├── main.py               # Entrada de la aplicación, CORS, routers
│   ├── database.py           # Configuración del engine y sesión
│   ├── models/
│   │   ├── categoria.py      # Modelo SQLModel de Categoria
│   │   ├── producto.py       # Modelos Producto, ProductoCategoria, ProductoIngrediente
│   │   └── ingrediente.py    # Modelo SQLModel de Ingrediente
│   ├── schemas/
│   │   ├── categoria.py      # Schemas de entrada/salida para Categoria
│   │   ├── producto.py       # Schemas de entrada/salida para Producto
│   │   └── ingrediente.py    # Schemas de entrada/salida para Ingrediente
│   ├── routers/
│   │   ├── categorias.py     # Endpoints REST de categorías
│   │   ├── productos.py      # Endpoints REST de productos
│   │   └── ingredientes.py   # Endpoints REST de ingredientes
│   ├── services/
│   │   ├── categoria_service.py   # Lógica de negocio de categorías
│   │   ├── producto_service.py    # Lógica de negocio de productos
│   │   └── ingrediente_service.py # Lógica de negocio de ingredientes
│   └── uow/
│       └── unit_of_work.py   # Patrón Unit of Work
├── requirements.txt          # Dependencias del proyecto
├── env.example               # Plantilla de variables de entorno
└── README.md
```

---

---

## Variables de entorno

Copiá `env.example` a `.env` y completá los valores. Variables disponibles:

| Variable | Descripción |
|----------|-------------|
| `POSTGRES_USER` | Usuario de PostgreSQL |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL |
| `POSTGRES_DB` | Nombre de la base de datos |
| `POSTGRES_HOST` | Host de la base de datos (usar `db` con Docker Compose) |
| `POSTGRES_PORT` | Puerto de PostgreSQL (default: 5432) |
| `SECRET_KEY` | Clave secreta para firmar JWT (mínimo 32 caracteres) |
| `ALGORITHM` | Algoritmo JWT (default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duración del access token en minutos (default: 30) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Duración del refresh token en días (default: 7) |
| `MP_ACCESS_TOKEN` | Access token de MercadoPago (modo TEST o producción) |
| `MP_PUBLIC_KEY` | Public key de MercadoPago (para el frontend) |
| `CLOUDINARY_CLOUD_NAME` | Cloud name de tu cuenta Cloudinary |
| `CLOUDINARY_API_KEY` | API Key de Cloudinary |
| `CLOUDINARY_API_SECRET` | API Secret de Cloudinary |
| `NGROK_URL` | URL pública de NGROK para webhooks en desarrollo |
| `CORS_ORIGINS` | Lista JSON de orígenes permitidos para CORS |

---

## Configuración de MercadoPago

### 1. Obtener credenciales TEST

1. Ingresá a [mercadopago.com/developers](https://www.mercadopago.com.ar/developers/panel)
2. Creá una aplicación o usá una existente
3. En la sección **Credenciales de prueba**, copiá:
   - `Access Token` → `MP_ACCESS_TOKEN`
   - `Public Key` → `MP_PUBLIC_KEY`

### 2. Configurar NGROK para webhooks locales

MercadoPago necesita una URL pública para enviarte el webhook. En desarrollo usás NGROK:

```bash
# Instalar NGROK: https://ngrok.com/download
ngrok http 8000
```

Copiá la URL HTTPS que genera (ej: `https://abc123.ngrok-free.dev`) y pegala en `.env`:

```env
NGROK_URL=https://abc123.ngrok-free.dev
```

### 3. Configurar el webhook en el panel de MP

1. En el panel de desarrolladores → **Notificaciones IPN / Webhooks**
2. URL de notificación: `https://tu-subdominio.ngrok-free.dev/api/v1/pagos/webhook`
3. Eventos a escuchar: `payment`
4. Guardá los cambios

> **Nota:** cada vez que reiniciás NGROK obtenés una URL nueva — actualizá el `.env` y el panel de MP.

---

## Configuración de Cloudinary

### 1. Crear cuenta

Registrate gratis en [cloudinary.com](https://cloudinary.com). El plan gratuito incluye 25 GB de almacenamiento.

### 2. Obtener credenciales

Desde el **Dashboard** de Cloudinary copiá:
- **Cloud Name** → `CLOUDINARY_CLOUD_NAME`
- **API Key** → `CLOUDINARY_API_KEY`
- **API Secret** → `CLOUDINARY_API_SECRET`

Las imágenes se suben a la carpeta `foodstore/productos` por defecto.

---

## WebSocket

El backend expone un endpoint WebSocket para notificaciones en tiempo real sobre el estado de los pedidos.

### Endpoint

```
ws://localhost:8000/api/v1/pedidos/ws
```

### Autenticación

La autenticación se realiza mediante la cookie HttpOnly `access_token` que el navegador envía automáticamente al hacer el handshake. No se necesita header adicional.

Si el token es inválido o está ausente, el servidor cierra la conexión con código `1008`.

### Mensajes que emite el servidor

El servidor envía objetos JSON con la estructura:

```json
{ "event": "NOMBRE_EVENTO", "data": { ... } }
```

| Evento | Cuándo se emite |
|--------|-----------------|
| `NUEVO_PEDIDO` | Al crear un pedido nuevo |
| `PEDIDO_CONFIRMADO` | Al confirmar el pago |
| `PEDIDO_EN_PREPARACION` | Al cambiar el estado a `EN_PREP` |
| `PEDIDO_EN_CAMINO` | Al cambiar el estado a `EN_CAMINO` |
| `PEDIDO_ENTREGADO` | Al marcar el pedido como entregado |
| `PEDIDO_CANCELADO` | Al cancelar un pedido |
| `SUBSCRIBED` | Confirmación de suscripción a un pedido específico |
| `UNSUBSCRIBED` | Confirmación de desuscripción |
| `ERROR` | Mensaje de error en la comunicación |

### Suscripción a un pedido específico

Para recibir eventos de un pedido concreto además de los de rol, enviá:

```json
{ "action": "subscribe_order", "order_id": 42 }
```

Para dejar de escucharlo:

```json
{ "action": "unsubscribe_order", "order_id": 42 }
```

---

## Autores

Arena Lucio
Cunto Tiago
Lopez Tubaro Mariano
Rojo Emiliano

