from typing import List, Optional
from datetime import datetime
from sqlmodel import Session, select
from fastapi import HTTPException
from .model import Producto, ProductoCategoria, ProductoIngrediente
from ..categorias.model import Categoria
from ..ingredientes.model import Ingrediente
from .schema import ProductoCreate, ProductoUpdate


def get_all(
    session: Session,
    offset: int = 0,
    limit: int = 20,
    disponible: Optional[bool] = None,
) -> List[Producto]:
    query = select(Producto)
    if disponible is not None:
        query = query.where(Producto.disponible == disponible)
    return session.exec(query.offset(offset).limit(limit)).all()


def get_by_id(session: Session, producto_id: int) -> Producto:
    p = session.get(Producto, producto_id)
    if not p:
        raise HTTPException(status_code=404, detail=f"Producto {producto_id} no encontrado")
    return p


def create(session: Session, data: ProductoCreate) -> Producto:
    producto = Producto(
        nombre=data.nombre,
        descripcion=data.descripcion,
        precio_base=data.precio_base,
        imagenes_url=data.imagenes_url,
        tiempo_prep_min=data.tiempo_prep_min,
        disponible=data.disponible,
    )
    session.add(producto)
    session.flush()

    for cat_id in data.categoria_ids:
        cat = session.get(Categoria, cat_id)
        if not cat:
            raise HTTPException(status_code=404, detail=f"Categoría {cat_id} no encontrada")
        session.add(ProductoCategoria(producto_id=producto.id, categoria_id=cat_id))

    for ing_data in data.ingredientes:
        ing = session.get(Ingrediente, ing_data.ingrediente_id)
        if not ing:
            raise HTTPException(status_code=404, detail=f"Ingrediente {ing_data.ingrediente_id} no encontrado")
        session.add(ProductoIngrediente(
            producto_id=producto.id,
            ingrediente_id=ing_data.ingrediente_id,
            es_removible=ing_data.es_removible,
            es_opcional=ing_data.es_opcional,
        ))

    session.commit()
    session.refresh(producto)
    return producto


def update(session: Session, producto_id: int, data: ProductoUpdate) -> Producto:
    producto = get_by_id(session, producto_id)
    update_data = data.model_dump(exclude_unset=True, exclude={"categoria_ids", "ingredientes"})
    update_data["updated_at"] = datetime.utcnow()
    for key, value in update_data.items():
        setattr(producto, key, value)

    if data.categoria_ids is not None:
        for pc in session.exec(
            select(ProductoCategoria).where(ProductoCategoria.producto_id == producto_id)
        ).all():
            session.delete(pc)
        for cat_id in data.categoria_ids:
            session.add(ProductoCategoria(producto_id=producto_id, categoria_id=cat_id))

    if data.ingredientes is not None:
        for pi in session.exec(
            select(ProductoIngrediente).where(ProductoIngrediente.producto_id == producto_id)
        ).all():
            session.delete(pi)
        for ing_data in data.ingredientes:
            session.add(ProductoIngrediente(
                producto_id=producto_id,
                ingrediente_id=ing_data.ingrediente_id,
                es_removible=ing_data.es_removible,
                es_opcional=ing_data.es_opcional,
            ))

    session.add(producto)
    session.commit()
    session.refresh(producto)
    return producto


def delete(session: Session, producto_id: int) -> None:
    producto = get_by_id(session, producto_id)

    for pc in session.exec(select(ProductoCategoria).where(ProductoCategoria.producto_id == producto_id)).all():
        session.delete(pc)

    for pi in session.exec(select(ProductoIngrediente).where(ProductoIngrediente.producto_id == producto_id)).all():
        session.delete(pi)

    session.delete(producto)
    session.commit()
