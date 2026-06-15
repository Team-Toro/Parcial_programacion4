# 🍔 Food Store

Sistema de gestión de pedidos de comida full-stack con pagos online, WebSocket en tiempo real y gestión de imágenes.

**Stack**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand + TanStack Query + FastAPI + SQLModel + PostgreSQL + MercadoPago + Cloudinary + WebSocket nativo

---

## 👨‍💻 Integrantes

- Arena Lucio
- Cunto Tiago
- Lopez Mariano
- Rojo Emiliano

---

## 🎥 Video explicativo + demo

📹 **https://youtu.be/mw7X0z7cMCc**

---

## 📋 Tabla de contenidos

- [Arquitectura](#-arquitectura)
- [Requisitos previos](#-requisitos-previos)
- [Setup rápido con Docker](#-setup-rápido-con-docker)
- [Variables de entorno](#-variables-de-entorno)
- [Configuración de servicios externos](#-configuración-de-servicios-externos)
- [Seed de datos](#-seed-de-datos)
- [Usuarios de prueba](#-usuarios-de-prueba)
- [Endpoints principales](#-endpoints-principales)
- [WebSocket](#-websocket)
- [Cloudinary](#-cloudinary)
- [MercadoPago](#-mercadopago)
- [Desarrollo local sin Docker](#-desarrollo-local-sin-docker)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Video demo](#-video-demo)

---

## 🏗️ Arquitectura

### Backend (FastAPI + SQLModel)

Capas con flujo de dependencias unidireccional. Ninguna capa importa de la capa superior:

```
Router → Service → UoW → Repository → Model
                    ↓
                 WSManager (broadcast post-commit, fuera del bloque UoW)
```

| Capa | Responsabilidad |
|------|-----------------|
| **Router** (`router.py`) | HTTP puro: parsea request, valida schema Pydantic, delega al Service, serializa response. |
| **Service** (`service.py`) | Lógica de negocio stateless. Orquesta repos a través del UoW. Emite eventos WS post-commit. |
| **UnitOfWork** (`uow/unit_of_work.py`) | Transacción atómica: sesión de BD, repositorios, `commit`/`rollback` automático. |
| **Repository** (`repository.py`) | Acceso a BD sin lógica de negocio. Hereda de `BaseRepository[T]`. |
| **Model** (`model.py`) | Tablas SQLModel + relaciones. |

Patrones aplicados: Unit of Work, Repository genérico, Service Layer, Snapshot Pattern (precios/nombres inmutables en pedidos), Soft Delete (`deleted_at`), Audit Trail append-only (`HistorialEstadoPedido`), State Machine (FSM de pedidos), Idempotent Payments, Connection Pool (WebSocket).

### Frontend (React + Feature-Sliced)

```
Pages → Components → Hooks/Stores → API → Types
```

- **Zustand** gestiona el estado del **cliente**: carrito, sesión, pago, conexión WS, UI.
- **TanStack Query** gestiona el estado del **servidor**: productos, pedidos, dashboard. Invalidación automática tras mutaciones y eventos WS.
- **Axios** con interceptor que refresca la sesión automáticamente ante un `401`.

---

## 🔧 Requisitos previos

### Opción A — Docker (recomendada)
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2

### Opción B — Local (sin Docker)
- Python **3.11+**
- Node.js **18+** y npm
- PostgreSQL **15+** corriendo localmente

### Cuentas externas (para funcionalidad completa)
- Cuenta de [MercadoPago Developers](https://www.mercadopago.com.ar/developers) (credenciales de **prueba/sandbox**)
- Cuenta de [Cloudinary](https://cloudinary.com/) (plan gratuito)
- Cuenta de [ngrok](https://ngrok.com/) (para recibir el webhook de MercadoPago en desarrollo)

> El proyecto **levanta y se navega sin estas cuentas**. Solo la subida de imágenes (Cloudinary) y el cobro real (MercadoPago) requieren credenciales. El catálogo del seed ya trae imágenes Cloudinary públicas.

---

## 🚀 Setup rápido con Docker

```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPO>
cd Parcial_programacion4

# 2. Crear los archivos de entorno a partir del ejemplo
cp backend/env.example backend/.env.docker
cp frontend/.env.example frontend/.env.docker   # contiene VITE_API_URL

# 3. (Opcional) Editar backend/.env.docker con tus credenciales
#    de MercadoPago, Cloudinary y NGROK. Ver sección "Variables de entorno".

# 4. Levantar todos los servicios
docker compose up --build

# 5. En otra terminal: cargar los datos iniciales (seed)
docker compose exec api python -m app.db.seed
```

Servicios y puertos:

| Servicio | URL | Puerto |
|----------|-----|--------|
| Frontend (Vite) | http://localhost:5173 | 5173 |
| Backend (FastAPI) | http://localhost:8000 | 8000 |
| Swagger UI | http://localhost:8000/docs | — |
| ReDoc | http://localhost:8000/redoc | — |
| PostgreSQL | localhost:5433 → contenedor 5432 | 5433 |
| ngrok dashboard | http://localhost:4040 | 4040 |

> El backend ejecuta `create_all_tables()` al arrancar, así que **no hay migraciones manuales**: las tablas se crean solas. Solo necesitás correr el seed (paso 5).

---

## 🔐 Variables de entorno

Plantilla completa en `backend/env.example`. Para **Docker** se usan archivos `.env.docker`; para **desarrollo local** se usa `.env`.

### Backend (`backend/.env.docker` o `backend/.env`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `POSTGRES_USER` | Usuario de PostgreSQL | `postgres` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | `postgres` |
| `POSTGRES_DB` | Nombre de la base | `food_store` |
| `POSTGRES_HOST` | Host de la base. **`db` en Docker**, `localhost` en local | `db` |
| `POSTGRES_PORT` | Puerto interno de PostgreSQL | `5432` |
| `SECRET_KEY` | Clave para firmar JWT (**mín. 32 chars**). Generar con `python -c "import secrets; print(secrets.token_hex(32))"` | `dev-super-secret-...` |
| `ALGORITHM` | Algoritmo JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Expiración del access token | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Expiración del refresh token | `7` |
| `MP_ACCESS_TOKEN` | Access Token de MercadoPago (backend) | `APP_USR-...` o `TEST-...` |
| `MP_PUBLIC_KEY` | Public Key de MercadoPago (frontend) | `APP_USR-...` o `TEST-...` |
| `NGROK_URL` | URL pública de ngrok (para `back_urls` y webhook de MP) | `https://xxx.ngrok-free.dev` |
| `CLOUDINARY_CLOUD_NAME` | Cloud name de Cloudinary | `mi-cloud-name` |
| `CLOUDINARY_API_KEY` | API Key de Cloudinary | `123456789012345` |
| `CLOUDINARY_API_SECRET` | API Secret de Cloudinary (**secreto**) | `abcdef...` |
| `FRONTEND_URL` | URL del frontend (redirect post-pago) | `http://localhost:5173` |
| `CORS_ORIGINS` | Orígenes permitidos (JSON array) | `["http://localhost:5173"]` |

### Variables de ngrok (en el `.env` de la raíz del proyecto, junto a `docker-compose.yml`)

| Variable | Descripción |
|----------|-------------|
| `NGROK_URL` | Dominio fijo de ngrok que usa el contenedor `ngrok` |
| `NGROK_AUTHTOKEN` | Authtoken de tu cuenta ngrok |
| `NGROK_DOMAIN` | Subdominio fijo (opcional) |

### Frontend (`frontend/.env.docker` o `frontend/.env`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL base del backend | `http://localhost:8000` |

---

## 🌐 Configuración de servicios externos

### 1. MercadoPago

1. Entrá a [MercadoPago Developers](https://www.mercadopago.com.ar/developers) → creá una aplicación.
2. En **Credenciales de prueba**, copiá el `Access Token` y la `Public Key`.
3. Pegalos en `MP_ACCESS_TOKEN` y `MP_PUBLIC_KEY`.

### 2. Cloudinary

1. Creá una cuenta en [Cloudinary](https://cloudinary.com/) (plan gratis).
2. En el **Dashboard** copiá `Cloud Name`, `API Key` y `API Secret`.
3. Pegalos en `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

### 3. ngrok (webhook de MercadoPago en desarrollo)

MercadoPago necesita una URL pública para enviar el webhook IPN. ngrok expone tu backend local:

1. Creá una cuenta en [ngrok](https://ngrok.com/) → **Dashboard → Your Authtoken**.
2. (Opcional pero recomendado) creá un **dominio fijo**: ngrok → Domains → New Domain.
3. Cargá `NGROK_AUTHTOKEN`, `NGROK_DOMAIN` y `NGROK_URL`.
4. Con Docker, el contenedor `ngrok` arranca solo. El dashboard queda en http://localhost:4040.
5. En MercadoPago, configurá la URL de notificaciones apuntando a:
   `https://<tu-dominio-ngrok>/api/v1/pagos/webhook`

---

## 🌱 Seed de datos

Carga roles, formas de pago, estados de pedido, usuarios, categorías (jerárquicas), ingredientes, productos (con imágenes Cloudinary) y pedidos de muestra. **Es idempotente**: se puede correr varias veces sin duplicar.

```bash
# Con Docker
docker compose exec api python -m app.db.seed

# Local (con el venv activado, desde backend/)
python -m app.db.seed
```

---

## 👥 Usuarios de prueba

Tras correr el seed:

| Email | Contraseña | Rol | Acceso |
|-------|-----------|-----|--------|
| `admin@example.com` | `Admin1234!` | ADMIN | Acceso total: usuarios, categorías, productos, pedidos, stock, dashboard |
| `juan@example.com` | `Juan1234!` | CLIENTE | Catálogo, carrito, pedidos propios, pagos |
| `sofia.stock@example.com` | `Sofia1234!` | STOCK | Stock y disponibilidad de productos |
| `marcos.pedidos@example.com` | `Marcos1234!` | PEDIDOS | Avanzar estados de pedidos |

> La pantalla de login incluye un selector de cuentas demo para entrar rápido.

---

## 🛣️ Endpoints principales

Todos bajo el prefijo `/api/v1`. Documentación interactiva completa en **http://localhost:8000/docs**.

| Módulo | Endpoints destacados |
|--------|----------------------|
| **Auth** | `POST /auth/register` · `POST /auth/token` (login) · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` |
| **Usuarios** | `GET /auth/admin/usuarios` · activar/desactivar usuarios (ADMIN) |
| **Categorías** | `GET/POST /categorias` · `PATCH/DELETE /categorias/{id}` · `PATCH /categorias/{id}/imagen` (jerárquicas) |
| **Productos** | `GET/POST /productos` · `PATCH/DELETE /productos/{id}` · `PATCH /productos/{id}/imagenes` · `PATCH /productos/{id}/disponibilidad` |
| **Ingredientes** | `GET/POST /ingredientes` · `PATCH/DELETE /ingredientes/{id}` |
| **Direcciones** | `GET/POST /direcciones` · `PATCH /direcciones/{id}/principal` |
| **Formas de pago** | `GET /formas-pago` |
| **Estados de pedido** | `GET /estados-pedido` |
| **Pedidos** | `POST /pedidos` · `GET /pedidos/mis-pedidos` · `GET /pedidos` (admin) · `POST /pedidos/{id}/avanzar` · `POST /pedidos/{id}/cancelar` · `GET /pedidos/{id}/historial` |
| **Pagos** | `POST /pagos/create-preference` · `POST /pagos/webhook` · `POST /pagos/confirm` · `GET /pagos/pedido/{id}` |
| **Uploads** | `POST /uploads/imagen` · `DELETE /uploads/imagen/{public_id}` |
| **Admin** | `GET /admin/stats` (KPIs + gráficos del dashboard) |

### Máquina de estados del pedido (FSM)

```
PENDIENTE → CONFIRMADO → EN_PREP → EN_CAMINO → ENTREGADO
    ↓            ↓           ↓
              CANCELADO (terminal)
```

`ENTREGADO` y `CANCELADO` son terminales (no admiten transiciones salientes). Las transiciones se validan en la capa de servicio; cada cambio queda registrado en el historial append-only.

---

## 🔌 WebSocket

Notificaciones en tiempo real de cambios de estado de pedidos (reemplaza al polling).

- **Endpoint**: `ws://localhost:8000/api/v1/pedidos/ws`
- **Autenticación**: cookie `access_token` HttpOnly (enviada automáticamente por el navegador en el handshake). Cierre con código `1008` si la auth falla.
- **Canales (rooms)**: por rol (`role:admin`, `role:pedidos`, etc.) y por pedido (`order:{id}`).
- **Suscripción a un pedido**: el cliente envía `{ "action": "subscribe-order", "order_id": 123 }` (se valida que el pedido le pertenezca).
- **Broadcast**: siempre **después** del commit de la transacción.

El frontend gestiona la conexión con el hook `useWebSocket` (reconexión con backoff exponencial) y muestra un badge **"En vivo" / "Sin conexión"** mediante `WSManager` global.

Eventos emitidos: `NUEVO_PEDIDO`, `PEDIDO_CONFIRMADO`, `PEDIDO_EN_PREPARACION`, `PEDIDO_EN_CAMINO`, `PEDIDO_ENTREGADO`, `PEDIDO_CANCELADO`.

---

## 🖼️ Cloudinary

Gestión de imágenes de productos y categorías en un CDN global.

- **Subida**: `POST /api/v1/uploads/imagen` (multipart/form-data, rol ADMIN). Valida tipo MIME (`jpeg`, `png`, `webp`) y tamaño (**máx. 5 MB**). Devuelve `secure_url` y `public_id`.
- **Eliminación**: `DELETE /api/v1/uploads/imagen/{public_id}` (rol ADMIN).
- **Persistencia**: `imagenes_url[]` en Producto, `imagen_url` en Categoría.
- El SDK se configura automáticamente al arrancar si las variables `CLOUDINARY_*` están presentes. Sin ellas, el upload responde `503` pero el resto de la app funciona.

Desde el panel admin: `ProductoForm` / `CategoriaForm` usan el componente `ImageUpload` para subir y ver las imágenes en el catálogo.

---

## 💳 MercadoPago

Integración con **Checkout Pro** (SDK oficial de Python).

**Flujo de pago end-to-end:**

1. El cliente confirma el carrito en el checkout eligiendo `MERCADOPAGO`.
2. El backend crea el `Pedido` (estado `PENDIENTE`) y un registro `Pago` con `idempotency_key` (UUID).
3. `POST /pagos/create-preference` crea la preferencia en MercadoPago y devuelve el `init_point`.
4. El frontend redirige al checkout hospedado de MercadoPago.
5. Tras pagar, MercadoPago envía el **webhook** a `POST /pagos/webhook`. El backend **verifica el pago contra la API de MP** (no confía en el body), actualiza el `Pago` y avanza el pedido a `CONFIRMADO`.
6. Se emite un evento **WebSocket** notificando el cambio de estado en tiempo real.

**Tarjeta de prueba (sandbox)** — para que el pago resulte aprobado:

| Campo | Valor |
|-------|-------|
| Tarjeta | Mastercard `5031 7557 3453 0604` |
| CVV | `123` |
| Vencimiento | `11/30` |
| Titular | `APRO` (resultado aprobado) |
| DNI | `12345678` |

> Para que el webhook llegue a tu máquina, el backend debe ser accesible públicamente vía **ngrok** (ver configuración arriba) y `NGROK_URL` debe estar seteada.

---

## 💻 Desarrollo local sin Docker

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp env.example .env              # editar credenciales; POSTGRES_HOST=localhost

# Asegurate de tener PostgreSQL corriendo y la base 'food_store' creada
uvicorn app.main:app --reload    # http://localhost:8000

# En otra terminal, cargar el seed
python -m app.db.seed
```

> En local, `POSTGRES_HOST` debe ser `localhost` y `POSTGRES_PORT` el de tu PostgreSQL (típicamente `5432`).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env             # VITE_API_URL=http://localhost:8000
npm run dev                      # http://localhost:5173
```

---

## 📁 Estructura del proyecto

```
Parcial_programacion4/
├── backend/
│   ├── app/
│   │   ├── core/            # config, database, deps, security, websocket, base_repository, limiter
│   │   ├── uow/             # Unit of Work
│   │   ├── db/              # seed.py
│   │   ├── usuarios/        # auth + usuarios (router, service, repository, model, schema)
│   │   ├── categorias/      # categorías jerárquicas
│   │   ├── productos/       # catálogo + ingredientes + stock
│   │   ├── ingredientes/
│   │   ├── direcciones/
│   │   ├── formas_pago/
│   │   ├── estados_pedido/  # FSM
│   │   ├── pedidos/         # dominio central + WebSocket
│   │   ├── pagos/           # MercadoPago
│   │   ├── uploads/         # Cloudinary
│   │   ├── admin/           # dashboard / estadísticas
│   │   └── main.py          # app FastAPI, CORS, rate limiting, routers
│   ├── requirements.txt
│   ├── env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/           # vistas
│   │   ├── components/      # UI, dashboard, auth, pedidos, productos, categorías
│   │   ├── hooks/           # useWebSocket, useDebounce
│   │   ├── store/           # Zustand: auth, carrito, payment, ws, ui
│   │   ├── api/             # clientes Axios + TanStack Query
│   │   ├── types/           # tipos TypeScript
│   │   └── config.ts
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml       # db + api + frontend + ngrok
└── README.md
```

---

**Programación 4 — Tecnicatura Universitaria en Programación (TUP)**
