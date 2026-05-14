from sqlmodel import Session
from app.core.database import engine
from app.usuarios.refresh_token_repository import RefreshTokenRepository
from app.direcciones.repository import DireccionRepository
from app.formas_pago.repository import FormaPagoRepository
from app.estados_pedido.repository import EstadoPedidoRepository


class UnitOfWork:
    def __init__(self):
        self.session: Session = Session(engine)
        self.refresh_tokens: RefreshTokenRepository = RefreshTokenRepository(self.session)
        self.direcciones: DireccionRepository = DireccionRepository(self.session)
        self.formas_pago: FormaPagoRepository = FormaPagoRepository(self.session)
        self.estados_pedido: EstadoPedidoRepository = EstadoPedidoRepository(self.session)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.session.rollback()
        else:
            self.session.commit()
        self.session.close()

    def commit(self):
        self.session.commit()

    def rollback(self):
        self.session.rollback()


def get_uow():
    uow = UnitOfWork()
    try:
        yield uow
        uow.session.commit()
    except Exception:
        uow.session.rollback()
        raise
    finally:
        uow.session.close()
