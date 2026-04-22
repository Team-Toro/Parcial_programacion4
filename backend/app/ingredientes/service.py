from typing import List
from sqlmodel import Session, select
from fastapi import HTTPException
from .model import Ingrediente
from .schema import IngredienteCreate, IngredienteUpdate


def get_all(session: Session, offset: int = 0, limit: int = 20) -> List[Ingrediente]:
    return session.exec(select(Ingrediente).offset(offset).limit(limit)).all()


def get_by_id(session: Session, ingrediente_id: int) -> Ingrediente:
    ing = session.get(Ingrediente, ingrediente_id)
    if not ing:
        raise HTTPException(status_code=404, detail=f"Ingrediente {ingrediente_id} no encontrado")
    return ing


def create(session: Session, data: IngredienteCreate) -> Ingrediente:
    existing = session.exec(select(Ingrediente).where(Ingrediente.nombre == data.nombre)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe un ingrediente con ese nombre")
    ing = Ingrediente.model_validate(data)
    session.add(ing)
    session.commit()
    session.refresh(ing)
    return ing


def update(session: Session, ingrediente_id: int, data: IngredienteUpdate) -> Ingrediente:
    ing = get_by_id(session, ingrediente_id)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ing, key, value)
    session.add(ing)
    session.commit()
    session.refresh(ing)
    return ing


def delete(session: Session, ingrediente_id: int) -> None:
    ing = get_by_id(session, ingrediente_id)
    session.delete(ing)
    session.commit()
