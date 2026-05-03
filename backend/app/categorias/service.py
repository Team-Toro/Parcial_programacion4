from typing import List
from datetime import datetime
from fastapi import HTTPException, status
from .model import Categoria
from .schema import CategoriaCreate, CategoriaUpdate, CategoriaStats
from .repository import CategoriaRepository
from ..uow.unit_of_work import UnitOfWork

MAX_CATEGORY_DEPTH = 2

class CategoriaService:
    def get_all(self, uow: UnitOfWork, offset: int = 0, limit: int = 20) -> List[Categoria]:
        with uow:
            repo = CategoriaRepository(uow.session)
            return repo.get_all(offset, limit)

    def get_by_id(self, uow: UnitOfWork, categoria_id: int) -> Categoria:
        with uow:
            repo = CategoriaRepository(uow.session)
            categoria = repo.get_by_id(categoria_id)
            if not categoria:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Categoría {categoria_id} no encontrada"
                )
            return categoria

    def get_stats(self, uow: UnitOfWork, categoria_id: int) -> CategoriaStats:
        self.get_by_id(uow, categoria_id)
        
        with uow:
            repo = CategoriaRepository(uow.session)
            subcategorias_count = repo.count_subcategorias(categoria_id)
            productos_count = repo.count_productos(categoria_id)
            nivel = self.get_level(repo, categoria_id)
            
            return CategoriaStats(
                subcategorias_count=subcategorias_count,
                productos_count=productos_count,
                nivel=nivel
            )

    def _validate_depth(self, repo: CategoriaRepository, parent_id: int | None) -> None:
        if parent_id is None:
            return
        
        nivel = self.get_level(repo, parent_id)
        if nivel >= MAX_CATEGORY_DEPTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Se alcanzó el límite máximo de {MAX_CATEGORY_DEPTH + 1} niveles de profundidad"
            )

    def _validate_circular_reference(
        self, 
        repo: CategoriaRepository, 
        categoria_id: int, 
        new_parent_id: int | None
    ) -> None:
        if new_parent_id is None:
            return
        
        if self._has_circular_reference(repo, categoria_id, new_parent_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede establecer una referencia circular entre categorías"
            )

    def _has_circular_reference(
        self, 
        repo: CategoriaRepository, 
        categoria_id: int, 
        new_parent_id: int
    ) -> bool:
        if new_parent_id == categoria_id:
            return True
        ancestors = self._get_ancestors(repo, new_parent_id)
        return categoria_id in {cat.id for cat in ancestors}

    def _get_ancestors(self, repo: CategoriaRepository, categoria_id: int) -> List[Categoria]:
        ancestors = []
        current_id = categoria_id
        visited = set()
        
        while current_id and current_id not in visited:
            visited.add(current_id)
            cat = repo.get_by_id(current_id)
            if not cat or not cat.parent_id:
                break
            ancestors.append(cat)
            current_id = cat.parent_id
        
        return ancestors

    def get_level(self, repo: CategoriaRepository, categoria_id: int) -> int:
        ancestors = self._get_ancestors(repo, categoria_id)
        return len(ancestors)

    def _validate_parent_exists(self, repo: CategoriaRepository, parent_id: int | None) -> None:
        if parent_id is None:
            return
        
        if not repo.get_by_id(parent_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La categoría padre {parent_id} no existe"
            )

    def create(self, uow: UnitOfWork, data: CategoriaCreate) -> Categoria:
        with uow:
            repo = CategoriaRepository(uow.session)
            
            if repo.get_by_nombre(data.nombre):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ya existe una categoría con ese nombre"
                )
            
            if data.parent_id:
                self._validate_parent_exists(repo, data.parent_id)
                self._validate_depth(repo, data.parent_id)
            
            categoria = Categoria.model_validate(data)
            repo.save(categoria)
            
            uow.commit()
            uow.session.refresh(categoria)
            return categoria

    def update(self, uow: UnitOfWork, categoria_id: int, data: CategoriaUpdate) -> Categoria:
        with uow:
            repo = CategoriaRepository(uow.session)
            categoria = repo.get_by_id(categoria_id)
            
            if not categoria:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Categoría {categoria_id} no encontrada"
                )
            
            if data.nombre is not None:
                existing = repo.get_by_nombre(data.nombre, exclude_id=categoria_id)
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Ya existe una categoría con ese nombre"
                    )
            
            if data.parent_id is not None:
                self._validate_parent_exists(repo, data.parent_id)
                self._validate_depth(repo, data.parent_id)
                self._validate_circular_reference(repo, categoria_id, data.parent_id)
            
            update_data = data.model_dump(exclude_unset=True)
            update_data["updated_at"] = datetime.utcnow()
            
            for key, value in update_data.items():
                setattr(categoria, key, value)
            
            repo.save(categoria)
            uow.commit()
            uow.session.refresh(categoria)
            return categoria

    def delete(self, uow: UnitOfWork, categoria_id: int) -> None:
        with uow:
            repo = CategoriaRepository(uow.session)
            categoria = repo.get_by_id(categoria_id)
            
            if not categoria:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Categoría {categoria_id} no encontrada"
                )
            
            now = datetime.utcnow()
            
            subcategorias = repo.get_subcategorias(categoria_id)
            for sub in subcategorias:
                sub.deleted_at = now
                repo.save(sub)
            
            productos_relaciones = repo.get_productos_relaciones(categoria_id)
            
            for pc in productos_relaciones:
                uow.session.delete(pc)
            
            categoria.deleted_at = now
            repo.save(categoria)
            
            uow.commit()