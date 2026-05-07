# Food Store — Proyecto Integrador

Aplicación Fullstack (FastAPI + React) para gestión de productos, categorías e ingredientes de un negocio gastronómico.

## Video de presentación
https://youtu.be/87lTfzlcr_o

## Integrantes
- Arena Lucio
- Cunto Tiago
- Lopez Mariano
- Rojo Emiliano

## Tecnologías
- **Backend**: FastAPI, SQLModel, PostgreSQL, Pydantic v2, JWT (python-jose), bcrypt
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS 4, TanStack Query v5, Zustand, React Router v6, Lucide React, SheetJS (xlsx)

## Características

- Autenticación JWT con roles (admin/user)
- CRUD completo de Productos, Ingredientes y Categorías
- Categorías jerárquicas (hasta 3 niveles) con detección de referencias circulares
- Soft delete en todas las entidades
- Filtros múltiples, paginación y ordenamiento en listados
- Exportación a Excel (Productos e Ingredientes)
- Dashboard con KPIs de inventario
- Menú responsive (mobile/desktop)
- Seed data con datos de prueba

## Cómo correr el proyecto

### Requisitos previos
- Python 3.11+
- Node.js 18+
- PostgreSQL 15

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env   # Editar DATABASE_URL con credenciales locales
uvicorn app.main:app --reload
```

### Seed data (opcional — carga datos de prueba)

```bash
cd backend
python -m app.db.seed
```

Esto crea:
- **Usuarios**: `admin / Admin1234!` (role=admin), `juan / Juan1234!` (role=user)
- **Categorías**: Bebidas → Gaseosas, Aguas; Comidas → Pizzas, Sandwiches
- **Ingredientes**: Harina, Queso Mozzarella, Tomate, Agua, Levadura
- **Productos**: 8 productos con categorías e ingredientes asociados

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Docker

```bash
cp backend/env.example backend/.env.docker
cp frontend/.env.example frontend/.env.docker
docker compose up --build
```

## Endpoints principales

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | No | Registro de usuario |
| POST | `/api/v1/auth/token` | No | Login (JWT) |
| GET | `/api/v1/auth/me` | Sí | Perfil del usuario |
| GET/POST | `/productos` | GET: No / POST: Sí | Listar/Crear productos |
| GET/PATCH/DELETE | `/productos/{id}` | GET: No / PATCH,DELETE: Sí | CRUD producto individual |
| POST | `/productos/{id}/reactivar` | Sí | Reactivar producto eliminado |
| GET/POST | `/ingredientes` | GET: No / POST: Sí | Listar/Crear ingredientes |
| GET/PATCH/DELETE | `/ingredientes/{id}` | GET: No / PATCH,DELETE: Sí | CRUD ingrediente individual |
| GET/POST | `/categorias` | GET: No / POST: Sí | Listar/Crear categorías |
| GET/PATCH/DELETE | `/categorias/{id}` | GET: No / PATCH,DELETE: Sí | CRUD categoría individual |
| GET | `/categorias/{id}/stats` | No | Estadísticas de categoría |
| GET | `/admin/dashboard` | Sí | KPIs del inventario |

Documentación interactiva: http://localhost:8000/docs

## Credenciales de prueba

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | Admin1234! | admin (acceso total) |
| juan | Juan1234! | user (acceso básico) |
