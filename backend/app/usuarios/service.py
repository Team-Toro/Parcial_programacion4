"""
Service de Usuario — lógica de negocio.

Stateless, orquesta operaciones sobre los repositorios a través del UoW.
Lanza HTTPException. No hace commit/rollback directamente.

Capa: Service
Conoce a: UoW, Repository (indirectamente vía UoW)
NO conoce a: Router

Regla de imports:
    Router → Service → UoW → Repository → Model
"""

from datetime import datetime, timedelta

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_refresh_token,
    hash_token,
)
from app.uow.unit_of_work import UnitOfWork
from .model import Usuario, UsuarioRol
from app.refresh_tokens.model import RefreshToken
from .repository import UsuarioRepository
from .schema import UsuarioCreate, UsuarioPublic, UsuarioToken


class UsuarioService:
    """Lógica de negocio para autenticación y gestión de usuarios."""

    ALLOWED_ROLES = {"ADMIN", "CLIENTE", "STOCK", "PEDIDOS"}

    def get_by_username(self, uow: UnitOfWork, username: str) -> Usuario | None:
        """Obtiene un usuario por username (sin lanzar HTTPException)."""
        repo = UsuarioRepository(uow.session)
        return repo.get_by_username(username)

    def register(self, uow: UnitOfWork, user_in: UsuarioCreate) -> Usuario:
        """Registra un nuevo usuario. El rol siempre es 'user'."""
        repo = UsuarioRepository(uow.session)
        if repo.get_by_email(user_in.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El email ya está registrado",
            )

        usuario = Usuario(
            last_name=user_in.last_name,
            first_name=user_in.first_name,
            email=user_in.email,
            celular=user_in.celular,
            hashed_password=hash_password(user_in.password),
        )
        repo.add(usuario)
        repo.flush()
        repo.refresh(usuario)
        repo.add(UsuarioRol(
            usuario_id=usuario.id,
            role_id="CLIENTE",
            assigned_by=None,
            expires_at=None,
        ))
        return usuario

    def authenticate(self, uow: UnitOfWork, username: str, password: str) -> UsuarioToken:
        """Autentica con username + password y retorna un Token con JWT + refresh token."""
        repo = UsuarioRepository(uow.session)
        user = repo.get_by_username(username)

        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if user.disabled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cuenta de usuario desactivada",
            )

        roles = repo.get_roles_for_user(user.id)
        access_token = create_access_token(
            data={"sub": user.email, "roles": roles}
        )

        raw_rt, hash_rt = generate_refresh_token()
        rt = RefreshToken(
            usuario_id=user.id,
            token_hash=hash_rt,
            expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        uow.refresh_tokens.add(rt)
        uow.refresh_tokens.flush()

        return UsuarioToken(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            refresh_token=raw_rt,
        )

    def refresh(self, uow: UnitOfWork, raw_refresh_token: str) -> UsuarioToken:
        """Valida el refresh token, lo rota y emite nuevos access + refresh tokens."""
        token_hash = hash_token(raw_refresh_token)
        rt = uow.refresh_tokens.get_active_by_hash(token_hash)
        if not rt:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido o expirado",
            )

        repo = UsuarioRepository(uow.session)
        usuario = repo.get_by_id(rt.usuario_id)
        if not usuario or usuario.disabled:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario inactivo",
            )

        # ROTACIÓN: revocar el viejo, crear uno nuevo
        uow.refresh_tokens.revoke(rt)

        raw_new, hash_new = generate_refresh_token()
        new_rt = RefreshToken(
            usuario_id=usuario.id,
            token_hash=hash_new,
            expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        uow.refresh_tokens.add(new_rt)

        # Roles actuales del usuario (no del JWT viejo)
        roles = repo.get_roles_for_user(usuario.id)
        access_token = create_access_token(data={"sub": usuario.email, "roles": roles})

        return UsuarioToken(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            refresh_token=raw_new,
        )

    def logout(self, uow: UnitOfWork, raw_refresh_token: str) -> None:
        """Revoca el refresh token dado (best-effort — no lanza si no existe)."""
        token_hash = hash_token(raw_refresh_token)
        rt = uow.refresh_tokens.get_by_hash(token_hash)
        if rt:
            uow.refresh_tokens.revoke(rt)

    def to_public(self, uow: UnitOfWork, usuario: Usuario) -> UsuarioPublic:
        repo = UsuarioRepository(uow.session)
        roles = repo.get_roles_for_user(usuario.id)
        return UsuarioPublic(
            id=usuario.id,
            first_name=usuario.first_name,
            last_name=usuario.last_name,
            email=usuario.email,
            celular=usuario.celular,
            roles=roles,
            disabled=usuario.disabled,
        )

    def list_all(self, uow: UnitOfWork) -> list[Usuario]:
        """Lista todos los usuarios."""
        repo = UsuarioRepository(uow.session)
        return repo.get_all()

    def list_users(
        self,
        uow: UnitOfWork,
        offset: int = 0,
        limit: int = 20,
        q: str | None = None,
        role: str | None = None,
        disabled: bool | None = None,
        sort: str | None = None,
        order: str = "asc",
    ) -> list[Usuario]:
        repo = UsuarioRepository(uow.session)
        return repo.list(
            offset=offset,
            limit=limit,
            q=q,
            role=role,
            disabled=disabled,
            sort=sort,
            order=order,
        )

    def set_disabled(self, uow: UnitOfWork, user_id: int, disabled: bool) -> Usuario:
        """Activa o desactiva la cuenta de un usuario."""
        repo = UsuarioRepository(uow.session)
        user = repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )
        user.disabled = disabled
        repo.add(user)
        repo.flush()
        repo.refresh(user)
        return user

    def set_roles(self, uow: UnitOfWork, user_id: int, roles: list[str] | None) -> Usuario:
        repo = UsuarioRepository(uow.session)
        user = repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        requested = [r for r in (roles or []) if r in self.ALLOWED_ROLES]
        final_roles = requested or ["CLIENTE"]
        repo.replace_roles_for_user(user_id, final_roles)

        if not requested:
            user.disabled = True
        repo.add(user)
        repo.flush()
        repo.refresh(user)
        return user

    def ensure_default_role_on_activate(self, uow: UnitOfWork, user: Usuario) -> None:
        repo = UsuarioRepository(uow.session)
        roles = repo.get_roles_for_user(user.id)
        if not roles:
            repo.replace_roles_for_user(user.id, ["CLIENTE"])
