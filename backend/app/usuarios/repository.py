from typing import List, Optional

from sqlalchemy import or_
from sqlmodel import Session, col, func, select

from .model import Usuario


class UsuarioRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_all(self) -> List[Usuario]:
        return self.session.exec(select(Usuario)).all()

    def list(
        self,
        offset: int,
        limit: int,
        q: Optional[str] = None,
        role: Optional[str] = None,
        disabled: Optional[bool] = None,
        sort: Optional[str] = None,
        order: str = "asc",
    ) -> List[Usuario]:
        query = select(Usuario)

        q_norm = q.strip().lower() if q else None
        if q_norm:
            query = query.where(
                or_(
                    func.lower(col(Usuario.username)).contains(q_norm),
                    func.lower(func.coalesce(col(Usuario.full_name), "")).contains(q_norm),
                    func.lower(col(Usuario.email)).contains(q_norm),
                )
            )

        if role is not None:
            query = query.where(col(Usuario.role) == role)

        if disabled is not None:
            query = query.where(col(Usuario.disabled) == disabled)

        sort_map = {
            "username": col(Usuario.username),
            "email": col(Usuario.email),
            "role": col(Usuario.role),
            "id": col(Usuario.id),
        }
        sort_col = sort_map.get(sort or "")
        if sort_col is not None:
            query = query.order_by(sort_col.desc() if order == "desc" else sort_col.asc())
        else:
            query = query.order_by(col(Usuario.id).asc())

        return self.session.exec(query.offset(offset).limit(limit)).all()

    def get_by_id(self, usuario_id: int) -> Optional[Usuario]:
        return self.session.get(Usuario, usuario_id)

    def get_by_username(self, username: str) -> Optional[Usuario]:
        return self.session.exec(
            select(Usuario).where(Usuario.username == username)
        ).first()

    def get_by_email(self, email: str) -> Optional[Usuario]:
        return self.session.exec(
            select(Usuario).where(Usuario.email == email)
        ).first()

    def add(self, obj) -> None:
        self.session.add(obj)

    def delete(self, obj) -> None:
        self.session.delete(obj)

    def flush(self) -> None:
        self.session.flush()

    def refresh(self, obj) -> None:
        self.session.refresh(obj)
