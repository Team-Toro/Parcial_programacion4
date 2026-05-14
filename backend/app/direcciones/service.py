from typing import List
from datetime import datetime
from fastapi import HTTPException, status
from .model import DireccionEntrega
from .schema import DireccionCreate, DireccionUpdate
from ..uow.unit_of_work import UnitOfWork


class DireccionService:

    def list_user_addresses(self, uow: UnitOfWork, usuario_id: int) -> List[DireccionEntrega]:
        return uow.direcciones.list_by_user(usuario_id, include_deleted=False)

    def get_user_address(self, uow: UnitOfWork, direccion_id: int, usuario_id: int) -> DireccionEntrega:
        direccion = uow.direcciones.get_by_id_for_user(direccion_id, usuario_id)
        if not direccion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dirección {direccion_id} no encontrada"
            )
        return direccion

    def create(self, uow: UnitOfWork, usuario_id: int, data: DireccionCreate) -> DireccionEntrega:
        if data.es_principal:
            uow.direcciones.unmark_principal_for_user(usuario_id)

        direccion = DireccionEntrega(
            usuario_id=usuario_id,
            alias=data.alias,
            linea1=data.linea1,
            linea2=data.linea2,
            ciudad=data.ciudad,
            provincia=data.provincia,
            codigo_postal=data.codigo_postal,
            latitud=data.latitud,
            longitud=data.longitud,
            es_principal=data.es_principal,
        )
        uow.direcciones.add(direccion)
        uow.direcciones.flush()
        uow.direcciones.refresh(direccion)
        return direccion

    def update(self, uow: UnitOfWork, direccion_id: int, usuario_id: int, data: DireccionUpdate) -> DireccionEntrega:
        direccion = self.get_user_address(uow, direccion_id, usuario_id)

        update_data = data.model_dump(exclude_unset=True)

        # Si es_principal pasa de false → true, desmarcar las demás primero
        if update_data.get("es_principal") is True and not direccion.es_principal:
            uow.direcciones.unmark_principal_for_user(usuario_id)
            uow.session.expire(direccion)

        update_data["updated_at"] = datetime.utcnow()
        for key, value in update_data.items():
            setattr(direccion, key, value)

        uow.direcciones.add(direccion)
        uow.direcciones.flush()
        return direccion

    def marcar_principal(self, uow: UnitOfWork, direccion_id: int, usuario_id: int) -> DireccionEntrega:
        direccion = self.get_user_address(uow, direccion_id, usuario_id)
        uow.direcciones.unmark_principal_for_user(usuario_id)
        uow.session.expire(direccion)
        direccion.es_principal = True
        direccion.updated_at = datetime.utcnow()
        uow.direcciones.add(direccion)
        uow.direcciones.flush()
        return direccion

    def soft_delete(self, uow: UnitOfWork, direccion_id: int, usuario_id: int) -> None:
        direccion = self.get_user_address(uow, direccion_id, usuario_id)
        uow.direcciones.soft_delete(direccion)
