from typing import List
from datetime import datetime
from fastapi import HTTPException, status
from .model import Categoria
from .schema import CategoriaCreate, CategoriaUpdate, CategoriaStats
from .repository import CategoriaRepository
from ..uow.unit_of_work import UnitOfWork

class CategoriaService:
    def get_all(
        self,
        uow: UnitOfWork,
        offset: int = 0,
        limit: int = 20,
        q: str | None = None,
        parent_id: int | None = None,
        only_roots: bool = False,
        sort: str | None = None,
        order: str = "asc",
        include_deleted: bool = False,
    ) -> List[Categoria]:
        """Retorna la lista paginada de categorías con filtros opcionales."""
        repo = CategoriaRepository(uow.session)
        return repo.get_all(
            offset=offset,
            limit=limit,
            q=q,
            parent_id=parent_id,
            only_roots=only_roots,
            sort=sort,
            order=order,
            include_deleted=include_deleted,
        )

    def get_by_id(self, uow: UnitOfWork, categoria_id: int, include_deleted: bool = False) -> Categoria:
        """Obtiene una categoría por ID o lanza 404 si no existe."""
        repo = CategoriaRepository(uow.session)
        categoria = (
            repo.get_by_id_including_deleted(categoria_id)
            if include_deleted
            else repo.get_by_id(categoria_id)
        )
        if not categoria:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Categoría {categoria_id} no encontrada"
            )
        return categoria

    def get_stats(self, uow: UnitOfWork, categoria_id: int) -> CategoriaStats:
        """Retorna conteo de subcategorías, productos y nivel jerárquico de una categoría."""
        self.get_by_id(uow, categoria_id)

        repo = CategoriaRepository(uow.session)
        subcategorias_count = repo.count_subcategorias(categoria_id)
        productos_count = repo.count_productos(categoria_id)
        nivel = self.get_level(repo, categoria_id)

        return CategoriaStats(
            subcategorias_count=subcategorias_count,
            productos_count=productos_count,
            nivel=nivel
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
            if not cat:
                break
            ancestors.append(cat)
            current_id = cat.parent_id

        return ancestors

    def get_level(self, repo: CategoriaRepository, categoria_id: int) -> int:
        """Retorna la profundidad de la categoría en el árbol jerárquico (0 = raíz)."""
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
        """Crea una categoría nueva validando unicidad de nombre y existencia del padre."""
        repo = CategoriaRepository(uow.session)

        if repo.get_by_nombre(data.nombre):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una categoría con ese nombre"
            )

        if data.parent_id:
            self._validate_parent_exists(repo, data.parent_id)

        categoria = Categoria(
            nombre=data.nombre,
            descripcion=data.descripcion,
            parent_id=data.parent_id,
            imagen_url=data.imagen_url,
        )
        repo.save(categoria)
        return categoria

    def update(self, uow: UnitOfWork, categoria_id: int, data: CategoriaUpdate) -> Categoria:
        """Actualiza campos de una categoría validando nombre único y sin referencias circulares."""
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
            self._validate_circular_reference(repo, categoria_id, data.parent_id)

        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()

        for key, value in update_data.items():
            setattr(categoria, key, value)

        repo.save(categoria)
        return categoria

    def delete(self, uow: UnitOfWork, categoria_id: int) -> None:
        """Soft delete de categoría y sus hijos; falla si tiene productos activos."""
        repo = CategoriaRepository(uow.session)
        categoria = repo.get_by_id(categoria_id)

        if not categoria:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Categoría {categoria_id} no encontrada"
            )

        now = datetime.utcnow()

        all_ids = repo.get_all_children_ids(categoria_id)

        if repo.count_active_productos_by_categoria_ids(all_ids) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede eliminar la categoría: tiene productos activos asociados"
            )

        for cid in all_ids:
            if cid == categoria_id:
                continue
            sub = repo.get_by_id(cid)
            if sub:
                sub.deleted_at = now
                repo.save(sub)

        for cid in all_ids:
            for pc in repo.get_productos_relaciones(cid):
                uow.session.delete(pc)

        categoria.deleted_at = now
        repo.save(categoria)

    def actualizar_imagen(self, uow: UnitOfWork, categoria_id: int, imagen_url: str | None) -> Categoria:
        """Actualiza la imagen de una categoría (acepta None para eliminarla)."""
        return self.update(uow, categoria_id, CategoriaUpdate(imagen_url=imagen_url))

    def reactivate(self, uow: UnitOfWork, categoria_id: int) -> Categoria:
        """Reactiva una categoría dada de baja limpiando su deleted_at."""
        repo = CategoriaRepository(uow.session)
        categoria = repo.get_by_id_including_deleted(categoria_id)
        if not categoria:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Categoría {categoria_id} no encontrada"
            )
        if categoria.deleted_at is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La categoría no está dada de baja"
            )
        categoria.deleted_at = None
        categoria.updated_at = datetime.utcnow()
        repo.save(categoria)
        return categoria
