from typing import List
from datetime import datetime
from fastapi import HTTPException
from .model import Categoria
from .schema import CategoriaCreate, CategoriaUpdate
from .repository import CategoriaRepository
from ..uow.unit_of_work import UnitOfWork


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

    def create(self, uow: UnitOfWork, data: CategoriaCreate) -> Categoria:
        repo = CategoriaRepository(uow.session)
        if repo.get_by_nombre(data.nombre):
            raise HTTPException(status_code=409, detail="Ya existe una categoría con ese nombre")
        categoria = Categoria.model_validate(data)
        repo.save(categoria)
        return categoria

    def update(self, uow: UnitOfWork, categoria_id: int, data: CategoriaUpdate) -> Categoria:
        repo = CategoriaRepository(uow.session)
        categoria = self.get_by_id(uow, categoria_id)
        if data.nombre is not None:
            if repo.get_by_nombre(data.nombre, exclude_id=categoria_id):
                raise HTTPException(status_code=409, detail="Ya existe una categoría con ese nombre")
        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        for key, value in update_data.items():
            setattr(categoria, key, value)
        repo.save(categoria)
        return categoria

    def delete(self, uow: UnitOfWork, categoria_id: int) -> None:
        repo = CategoriaRepository(uow.session)
        categoria = self.get_by_id(uow, categoria_id)
        categoria.deleted_at = datetime.utcnow()
        repo.save(categoria)
