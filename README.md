# Food Store — Proyecto Integrador Parcial 1

Aplicación Fullstack (FastAPI + React) para gestión de productos, categorías e ingredientes de un negocio gastronómico.

## Video de presentación
https://youtu.be/87lTfzlcr_o

## Integrantes
- Arena Lucio
- Cunto Tiago
- Lopez Mariano
- Rojo Emiliano

## Tecnologías
- **Backend**: FastAPI, SQLModel, PostgreSQL, Pydantic v2
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS 4, TanStack Query v5, React Router v6

## Cómo correr el proyecto

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp env.example .env        # Configurar DATABASE_URL
uvicorn app.main:app --reload
```

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
- `GET/POST /categorias`
- `GET/PATCH/DELETE /categorias/{id}`
- `GET/POST /ingredientes`
- `GET/PATCH/DELETE /ingredientes/{id}`
- `GET/POST /productos`
- `GET/PATCH/DELETE /productos/{id}`

Documentación interactiva: http://localhost:8000/docs
