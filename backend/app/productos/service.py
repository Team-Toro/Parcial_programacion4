from typing import List, Optional
from datetime import datetime
from fastapi import HTTPException
from .model import Producto, ProductoCategoria, ProductoIngrediente
from .schema import ProductoCreate, ProductoUpdate
from .repository import ProductoRepository
from ..uow.unit_of_work import UnitOfWork


def calcular_stock_disponible(producto: Producto) -> int:
    """Cuántas unidades del producto se pueden armar con el stock actual de sus ingredientes."""
    if not producto.ingredientes:
        return producto.stock_cantidad
    posibles = []
    for link in producto.ingredientes:
        if link.ingrediente is None or link.ingrediente.deleted_at is not None:
            return 0
        if link.cantidad <= 0:
            continue
        if link.ingrediente.stock_actual <= 0:
            return 0
        posibles.append(int(link.ingrediente.stock_actual / link.cantidad))
    return min(posibles) if posibles else 0


class ProductoService:

    def get_all(
        self,
        uow: UnitOfWork,
        offset: int = 0,
        limit: int = 20,
        disponible: Optional[bool] = None,
        categoria_id: Optional[int] = None,
        include_children: bool = True,
        q: Optional[str] = None,
        precio_min: Optional[float] = None,
        precio_max: Optional[float] = None,
        stock_min: Optional[int] = None,
        stock_max: Optional[int] = None,
        in_stock: Optional[bool] = None,
        ingrediente_id: Optional[int] = None,
        sort: Optional[str] = None,
        order: str = "asc",
        include_deleted: bool = False,
    ) -> List[Producto]:
        """Retorna la lista paginada de productos aplicando todos los filtros opcionales."""
        repo = ProductoRepository(uow.session)
        return repo.get_all(
            offset=offset,
            limit=limit,
            disponible=disponible,
            categoria_id=categoria_id,
            include_children=include_children,
            q=q,
            precio_min=precio_min,
            precio_max=precio_max,
            stock_min=stock_min,
            stock_max=stock_max,
            in_stock=in_stock,
            ingrediente_id=ingrediente_id,
            sort=sort,
            order=order,
            include_deleted=include_deleted,
        )

    def get_by_id(self, uow: UnitOfWork, producto_id: int) -> Producto:
        """Obtiene un producto por ID o lanza 404 si no existe."""
        repo = ProductoRepository(uow.session)
        p = repo.get_by_id(producto_id)
        if not p:
            raise HTTPException(status_code=404, detail=f"Producto {producto_id} no encontrado")
        return p

    def create(self, uow: UnitOfWork, data: ProductoCreate) -> Producto:
        """Crea un producto nuevo con sus categorías e ingredientes asociados."""
        repo = ProductoRepository(uow.session)
        producto = Producto(
            nombre=data.nombre,
            descripcion=data.descripcion,
            precio_base=data.precio_base,
            imagenes_url=data.imagenes_url,
            stock_cantidad=data.stock_cantidad,
            disponible=data.disponible,
        )
        repo.add(producto)
        repo.flush()

        for cat_id in data.categoria_ids:
            if not repo.get_categoria(cat_id):
                raise HTTPException(status_code=404, detail=f"Categoría {cat_id} no encontrada")
            repo.add(ProductoCategoria(producto_id=producto.id, categoria_id=cat_id))

        for ing_data in data.ingredientes:
            if not repo.get_ingrediente(ing_data.ingrediente_id):
                raise HTTPException(status_code=404, detail=f"Ingrediente {ing_data.ingrediente_id} no encontrado")
            repo.add(ProductoIngrediente(
                producto_id=producto.id,
                ingrediente_id=ing_data.ingrediente_id,
                es_removible=ing_data.es_removible,
                cantidad=ing_data.cantidad,
            ))

        repo.flush()
        repo.refresh(producto)
        return producto

    def update(self, uow: UnitOfWork, producto_id: int, data: ProductoUpdate) -> Producto:
        """Actualiza los campos y relaciones de un producto existente."""
        repo = ProductoRepository(uow.session)
        producto = self.get_by_id(uow, producto_id)
        update_data = data.model_dump(exclude_unset=True, exclude={"categoria_ids", "ingredientes"})
        update_data["updated_at"] = datetime.utcnow()
        for key, value in update_data.items():
            setattr(producto, key, value)

        if data.categoria_ids is not None:
            for cat_id in data.categoria_ids:
                if not repo.get_categoria(cat_id):
                    raise HTTPException(status_code=404, detail=f"Categoría {cat_id} no encontrada")
            for pc in repo.get_categorias_pivot(producto_id):
                repo.delete(pc)
            for cat_id in data.categoria_ids:
                repo.add(ProductoCategoria(producto_id=producto_id, categoria_id=cat_id))

        if data.ingredientes is not None:
            for ing_data in data.ingredientes:
                if not repo.get_ingrediente(ing_data.ingrediente_id):
                    raise HTTPException(status_code=404, detail=f"Ingrediente {ing_data.ingrediente_id} no encontrado")
            for pi in repo.get_ingredientes_pivot(producto_id):
                repo.delete(pi)
            for ing_data in data.ingredientes:
                repo.add(ProductoIngrediente(
                    producto_id=producto_id,
                    ingrediente_id=ing_data.ingrediente_id,
                    es_removible=ing_data.es_removible,
                    cantidad=ing_data.cantidad,
                ))

        repo.add(producto)
        repo.flush()
        repo.refresh(producto)
        return producto

    def delete(self, uow: UnitOfWork, producto_id: int) -> None:
        """Realiza un soft delete del producto (setea deleted_at)."""
        repo = ProductoRepository(uow.session)
        producto = self.get_by_id(uow, producto_id)
        producto.deleted_at = datetime.utcnow()
        repo.add(producto)
        repo.flush()

    def reactivate(self, uow: UnitOfWork, producto_id: int) -> Producto:
        """Reactiva un producto dado de baja limpiando su deleted_at."""
        repo = ProductoRepository(uow.session)
        producto = repo.get_by_id_including_deleted(producto_id)
        if not producto:
            raise HTTPException(status_code=404, detail=f"Producto {producto_id} no encontrado")
        if producto.deleted_at is None:
            raise HTTPException(status_code=400, detail="El producto no está dado de baja")
        producto.deleted_at = None
        producto.updated_at = datetime.utcnow()
        repo.add(producto)
        repo.flush()
        repo.refresh(producto)
        return producto

    def actualizar_imagenes(self, uow: UnitOfWork, producto_id: int, imagenes_url: List[str]) -> Producto:
        """Reemplaza la lista de URLs de imágenes de un producto."""
        repo = ProductoRepository(uow.session)
        producto = self.get_by_id(uow, producto_id)
        producto.imagenes_url = imagenes_url
        producto.updated_at = datetime.utcnow()
        repo.add(producto)
        repo.flush()
        repo.refresh(producto)
        return producto

    def update_disponibilidad(self, uow: UnitOfWork, producto_id: int, disponible: bool) -> Producto:
        """Activa o desactiva la visibilidad de un producto en el catálogo."""
        repo = ProductoRepository(uow.session)
        producto = repo.get_by_id_including_deleted(producto_id)
        if not producto:
            raise HTTPException(status_code=404, detail=f"Producto {producto_id} no encontrado")
        if producto.deleted_at is not None:
            raise HTTPException(status_code=400, detail="El producto está dado de baja")
        producto.disponible = disponible
        producto.updated_at = datetime.utcnow()
        repo.add(producto)
        repo.flush()
        repo.refresh(producto)
        return producto
