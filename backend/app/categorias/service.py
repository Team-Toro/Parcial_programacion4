from typing import List
from datetime import datetime
from sqlmodel import Session, select
from fastapi import HTTPException
from .model import Categoria
from .schema import CategoriaCreate, CategoriaUpdate


def get_all(session: Session, offset: int = 0, limit: int = 20) -> List[Categoria]:
    return session.exec(select(Categoria).offset(offset).limit(limit)).all()


def get_by_id(session: Session, categoria_id: int) -> Categoria:
    categoria = session.get(Categoria, categoria_id)
    if not categoria:
        raise HTTPException(status_code=404, detail=f"Categoría {categoria_id} no encontrada")
    return categoria


def create(session: Session, data: CategoriaCreate) -> Categoria:
    existing = session.exec(select(Categoria).where(Categoria.nombre == data.nombre)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe una categoría con ese nombre")
    categoria = Categoria.model_validate(data)
    session.add(categoria)
    session.commit()
    session.refresh(categoria)
    return categoria


def update(session: Session, categoria_id: int, data: CategoriaUpdate) -> Categoria:
    categoria = get_by_id(session, categoria_id)
    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    for key, value in update_data.items():
        setattr(categoria, key, value)
    session.add(categoria)
    session.commit()
    session.refresh(categoria)
    return categoria


def delete(session: Session, categoria_id: int) -> None:
    categoria = get_by_id(session, categoria_id)
    session.delete(categoria)
    session.commit()
