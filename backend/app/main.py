from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.database import create_all_tables
from app.core.limiter import limiter
from .categorias.router import router as categorias_router
from .ingredientes.router import router as ingredientes_router
from .productos.router import router as productos_router
from .usuarios.router import router as usuarios_router
from .direcciones.router import router as direcciones_router
from .formas_pago.router import router as formas_pago_router
from .estados_pedido.router import router as estados_pedido_router
from .pedidos.router import router as pedidos_router
from .pagos.router import router as pagos_router
from .uploads.router import router as uploads_router
from .admin.router import router as admin_router

app = FastAPI(title="Food Store API", version="1.0.0")
API_PREFIX = "/api/v1"

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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


app.include_router(categorias_router, prefix=API_PREFIX)
app.include_router(ingredientes_router, prefix=API_PREFIX)
app.include_router(productos_router, prefix=API_PREFIX)
app.include_router(usuarios_router, prefix=API_PREFIX)
app.include_router(direcciones_router, prefix=API_PREFIX)
app.include_router(formas_pago_router, prefix=API_PREFIX)
app.include_router(estados_pedido_router, prefix=API_PREFIX)
app.include_router(pedidos_router, prefix=API_PREFIX)
app.include_router(pagos_router, prefix=API_PREFIX)
app.include_router(uploads_router, prefix=API_PREFIX)
app.include_router(admin_router, prefix=API_PREFIX)


@app.get("/")
def root():
    return {"message": "Food Store API funcionando"}
