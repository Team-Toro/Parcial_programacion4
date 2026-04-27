from typing import List, Optional
from datetime import datetime
from fastapi import HTTPException
from .model import Producto, ProductoCategoria, ProductoIngrediente
from .schema import ProductoCreate, ProductoUpdate
from .repository import ProductoRepository
from ..uow.unit_of_work import UnitOfWork


class ProductoService:

    def get_all(
        self,
        uow: UnitOfWork,
        offset: int = 0,
        limit: int = 20,
        disponible: Optional[bool] = None,
    ) -> List[Producto]:
        repo = ProductoRepository(uow.session)
        return repo.get_all(offset, limit, disponible)

    def get_by_id(self, uow: UnitOfWork, producto_id: int) -> Producto:
        repo = ProductoRepository(uow.session)
        p = repo.get_by_id(producto_id)
        if not p:
            raise HTTPException(status_code=404, detail=f"Producto {producto_id} no encontrado")
        return p

    def create(self, uow: UnitOfWork, data: ProductoCreate) -> Producto:
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
            ))

        repo.flush()
        repo.refresh(producto)
        return producto

    def update(self, uow: UnitOfWork, producto_id: int, data: ProductoUpdate) -> Producto:
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
                ))

        repo.add(producto)
        repo.flush()
        repo.refresh(producto)
        return producto

    def delete(self, uow: UnitOfWork, producto_id: int) -> None:
        repo = ProductoRepository(uow.session)
        producto = self.get_by_id(uow, producto_id)
        producto.deleted_at = datetime.utcnow()
        repo.add(producto)
        repo.flush()
