from sqlmodel import Session
from ..database import engine


class UnitOfWork:
    def __init__(self):
        self.session: Session = Session(engine)

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
