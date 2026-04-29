from typing import List
from datetime import datetime
from fastapi import HTTPException
from sqlmodel import select
from .model import Categoria
from .schema import CategoriaCreate, CategoriaUpdate
from .repository import CategoriaRepository
from ..uow.unit_of_work import UnitOfWork


MAX_CATEGORY_DEPTH = 2

class CategoriaService:

    def get_all(self, uow: UnitOfWork, offset: int = 0, limit: int = 20) -> List[Categoria]:
        repo = CategoriaRepository(uow.session)
        return repo.get_all(offset, limit)

    def get_by_id(self, uow: UnitOfWork, categoria_id: int) -> Categoria:
        repo = CategoriaRepository(uow.session)
        categoria = repo.get_by_id(categoria_id)
        if not categoria:
            raise HTTPException(status_code=404, detail=f"Categoría {categoria_id} no encontrada")
        return categoria

    def _validate_depth(self, repo: CategoriaRepository, parent_id: int | None) -> None:
        if parent_id is None:
            return
        if not repo.can_be_parent(parent_id, MAX_CATEGORY_DEPTH):
            raise HTTPException(
                status_code=400,
                detail=f"Se alcanzó el límite máximo de {MAX_CATEGORY_DEPTH + 1} niveles de profundidad"
            )

    def _validate_circular_reference(self, repo: CategoriaRepository, categoria_id: int, new_parent_id: int | None) -> None:
        if new_parent_id is None:
            return
        if repo.has_circular_reference(categoria_id, new_parent_id):
            raise HTTPException(
                status_code=400,
                detail="No se puede establecer una referencia circular entre categorías"
            )

    def create(self, uow: UnitOfWork, data: CategoriaCreate) -> Categoria:
        repo = CategoriaRepository(uow.session)
        if repo.get_by_nombre(data.nombre):
            raise HTTPException(status_code=409, detail="Ya existe una categoría con ese nombre")
        
        if data.parent_id:
            self._validate_depth(repo, data.parent_id)
            self._validate_circular_reference(repo, 0, data.parent_id)
        
        categoria = Categoria.model_validate(data)
        repo.save(categoria)
        return categoria

    def update(self, uow: UnitOfWork, categoria_id: int, data: CategoriaUpdate) -> Categoria:
        repo = CategoriaRepository(uow.session)
        categoria = self.get_by_id(uow, categoria_id)
        
        if data.nombre is not None:
            if repo.get_by_nombre(data.nombre, exclude_id=categoria_id):
                raise HTTPException(status_code=409, detail="Ya existe una categoría con ese nombre")
        
        if data.parent_id is not None:
            self._validate_depth(repo, data.parent_id)
            self._validate_circular_reference(repo, categoria_id, data.parent_id)
        
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        for key, value in update_data.items():
            setattr(categoria, key, value)
        repo.save(categoria)
        return categoria

    def delete(self, uow: UnitOfWork, categoria_id: int) -> None:
        repo = CategoriaRepository(uow.session)
        categoria = self.get_by_id(uow, categoria_id)
        
        subcategorias = repo.get_subcategorias(categoria_id)
        for sub in subcategorias:
            sub.deleted_at = datetime.utcnow()
            repo.save(sub)
        
        from ..productos.model import ProductoCategoria
        productos = uow.session.exec(
            select(ProductoCategoria).where(ProductoCategoria.categoria_id == categoria_id)
        ).all()
        for pc in productos:
            uow.session.delete(pc)
        
        categoria.deleted_at = datetime.utcnow()
        repo.save(categoria)

    def get_subcategorias_count(self, uow: UnitOfWork, categoria_id: int) -> int:
        repo = CategoriaRepository(uow.session)
        return len(repo.get_subcategorias(categoria_id))

    def get_productos_count(self, uow: UnitOfWork, categoria_id: int) -> int:
        from ..productos.model import ProductoCategoria
        return len(uow.session.exec(
            select(ProductoCategoria).where(ProductoCategoria.categoria_id == categoria_id)
        ).all())
