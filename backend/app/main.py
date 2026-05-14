from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import create_all_tables
from .categorias.router import router as categorias_router
from .ingredientes.router import router as ingredientes_router
from .productos.router import router as productos_router
from .usuarios.router import router as usuarios_router
from .direcciones.router import router as direcciones_router

app = FastAPI(title="Food Store API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_all_tables()


app.include_router(categorias_router)
app.include_router(ingredientes_router)
app.include_router(productos_router)
app.include_router(usuarios_router)
app.include_router(direcciones_router)


@app.get("/")
def root():
    return {"message": "Food Store API funcionando"}
