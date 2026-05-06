from typing import List, Optional
from sqlmodel import Session, select

from .model import Usuario


class UsuarioRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_all(self) -> List[Usuario]:
        return self.session.exec(select(Usuario)).all()

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
