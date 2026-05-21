from datetime import datetime
from typing import List, Optional

from sqlmodel import Session, select

from .model import RefreshToken


class RefreshTokenRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_by_hash(self, token_hash: str) -> Optional[RefreshToken]:
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        return self.session.exec(stmt).first()

    def get_active_by_hash(self, token_hash: str) -> Optional[RefreshToken]:
        now = datetime.utcnow()
        stmt = select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.expires_at > now,
            RefreshToken.revoked_at == None,  # noqa: E711
        )
        return self.session.exec(stmt).first()

    def add(self, token: RefreshToken) -> None:
        self.session.add(token)

    def flush(self) -> None:
        self.session.flush()

    def revoke(self, token: RefreshToken) -> None:
        token.revoked_at = datetime.utcnow()
        self.session.add(token)

    def revoke_all_for_user(self, usuario_id: int) -> None:
        now = datetime.utcnow()
        stmt = select(RefreshToken).where(
            RefreshToken.usuario_id == usuario_id,
            RefreshToken.revoked_at == None,  # noqa: E711
        )
        tokens: List[RefreshToken] = self.session.exec(stmt).all()
        for t in tokens:
            t.revoked_at = now
            self.session.add(t)
