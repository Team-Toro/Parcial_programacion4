from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import create_db_and_tables
from .categorias.router import router as categorias_router
from .ingredientes.router import router as ingredientes_router
from .productos.router import router as productos_router

app = FastAPI(title="Food Store API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


app.include_router(categorias_router)
app.include_router(ingredientes_router)
app.include_router(productos_router)


@app.get("/")
def root():
    return {"message": "Food Store API funcionando"}
