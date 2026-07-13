from decimal import Decimal
from typing import List
from datetime import datetime
from fastapi import HTTPException
from .model import Ingrediente
from .schema import IngredienteCreate, IngredienteUpdate
from .repository import IngredienteRepository
from ..productos.repository import ProductoRepository
from ..uow.unit_of_work import UnitOfWork


class IngredienteService:

    def get_all(
        self,
        uow: UnitOfWork,
        offset: int = 0,
        limit: int = 20,
        q: str | None = None,
        es_alergeno: bool | None = None,
        sort: str | None = None,
        order: str = "asc",
        include_deleted: bool = False,
    ) -> List[Ingrediente]:
        repo = IngredienteRepository(uow.session)
        return repo.get_all(
            offset=offset,
            limit=limit,
            q=q,
            es_alergeno=es_alergeno,
            sort=sort,
            order=order,
            include_deleted=include_deleted,
        )

    def get_by_id(self, uow: UnitOfWork, ingrediente_id: int) -> Ingrediente:
        repo = IngredienteRepository(uow.session)
        ing = repo.get_by_id(ingrediente_id)
        if not ing:
            raise HTTPException(status_code=404, detail=f"Ingrediente {ingrediente_id} no encontrado")
        return ing

    def create(self, uow: UnitOfWork, data: IngredienteCreate) -> Ingrediente:
        repo = IngredienteRepository(uow.session)
        if repo.get_by_nombre(data.nombre):
            raise HTTPException(status_code=409, detail="Ya existe un ingrediente con ese nombre")
        ing = Ingrediente(
            nombre=data.nombre,
            descripcion=data.descripcion,
            es_alergeno=data.es_alergeno,
            unidad=data.unidad,
            stock_actual=data.stock_actual,
            precio=data.precio,
        )
        repo.save(ing)
        return ing

    def update(self, uow: UnitOfWork, ingrediente_id: int, data: IngredienteUpdate) -> Ingrediente:
        repo = IngredienteRepository(uow.session)
        ing = self.get_by_id(uow, ingrediente_id)
        if data.nombre is not None:
            if repo.get_by_nombre(data.nombre, exclude_id=ingrediente_id):
                raise HTTPException(status_code=409, detail="Ya existe un ingrediente con ese nombre")
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        for key, value in update_data.items():
            setattr(ing, key, value)
        repo.save(ing)

        if "precio" in update_data:
            self._recalcular_precios_productos(uow, ingrediente_id)

        return ing

    def _recalcular_precios_productos(self, uow: UnitOfWork, ingrediente_id: int) -> None:
        producto_repo = ProductoRepository(uow.session)
        pivots = producto_repo.get_pivots_by_ingrediente(ingrediente_id)
        now = datetime.utcnow()
        seen_producto_ids: set[int] = set()
        for pivot in pivots:
            if pivot.producto_id is None or pivot.producto_id in seen_producto_ids:
                continue
            producto = producto_repo.get_by_id_including_deleted(pivot.producto_id)
            if producto is None or producto.deleted_at is not None:
                continue
            nuevo_precio = Decimal("0")
            for link in producto.ingredientes:
                if link.ingrediente is None or link.ingrediente.deleted_at is not None:
                    continue
                nuevo_precio += Decimal(str(link.ingrediente.precio)) * Decimal(str(link.cantidad))
            producto.precio_base = nuevo_precio
            producto.updated_at = now
            producto_repo.add(producto)
            seen_producto_ids.add(pivot.producto_id)

    def delete(self, uow: UnitOfWork, ingrediente_id: int) -> None:
        repo = IngredienteRepository(uow.session)
        ing = self.get_by_id(uow, ingrediente_id)
        ing.deleted_at = datetime.utcnow()
        repo.save(ing)
        self._recalcular_precios_productos(uow, ingrediente_id)

    def reactivate(self, uow: UnitOfWork, ingrediente_id: int) -> Ingrediente:
        repo = IngredienteRepository(uow.session)
        ing = repo.get_by_id_including_deleted(ingrediente_id)
        if not ing:
            raise HTTPException(status_code=404, detail=f"Ingrediente {ingrediente_id} no encontrado")
        if ing.deleted_at is None:
            raise HTTPException(status_code=400, detail="El ingrediente no está dado de baja")
        ing.deleted_at = None
        ing.updated_at = datetime.utcnow()
        repo.save(ing)
        self._recalcular_precios_productos(uow, ingrediente_id)
        return ing
