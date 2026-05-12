from typing import List, Optional

from sqlalchemy import or_
from sqlmodel import Session, col, func, select

from .model import Usuario, UsuarioRol


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
            full_name = func.concat(col(Usuario.first_name), " ", col(Usuario.last_name))
            query = query.where(
                or_(
                    func.lower(col(Usuario.email)).contains(q_norm),
                    func.lower(col(Usuario.first_name)).contains(q_norm),
                    func.lower(col(Usuario.last_name)).contains(q_norm),
                    func.lower(full_name).contains(q_norm),
                )
            )

        if role is not None:
            role_subquery = select(UsuarioRol.usuario_id).where(
                UsuarioRol.role_id == role
            )
            query = query.where(col(Usuario.id).in_(role_subquery))

        if disabled is not None:
            query = query.where(col(Usuario.disabled) == disabled)

        sort_map = {
            "email": col(Usuario.email),
            "first_name": col(Usuario.first_name),
            "last_name": col(Usuario.last_name),
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
        return self.get_by_email(username)

    def get_by_email(self, email: str) -> Optional[Usuario]:
        return self.session.exec(
            select(Usuario).where(Usuario.email == email)
        ).first()

    def get_roles_for_user(self, usuario_id: int) -> List[str]:
        return self.session.exec(
            select(UsuarioRol.role_id).where(UsuarioRol.usuario_id == usuario_id)
        ).all()

    def replace_roles_for_user(self, usuario_id: int, roles: List[str]) -> None:
        for row in self.session.exec(
            select(UsuarioRol).where(UsuarioRol.usuario_id == usuario_id)
        ).all():
            self.session.delete(row)
        for role_id in roles:
            self.session.add(UsuarioRol(
                usuario_id=usuario_id,
                role_id=role_id,
                assigned_by=None,
                expires_at=None,
            ))

    def add(self, obj) -> None:
        self.session.add(obj)

    def delete(self, obj) -> None:
        self.session.delete(obj)

    def flush(self) -> None:
        self.session.flush()

    def refresh(self, obj) -> None:
        self.session.refresh(obj)
