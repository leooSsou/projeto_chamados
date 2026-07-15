from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

# Argumentos especiais para o SQLite funcionar com múltiplas threads
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL, connect_args=connect_args
)

_SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def SessionLocal():
    """
    Retorna uma instância de Sessão do Banco de Dados.
    Se estiver rodando em ambiente de testes (pytest), retorna dinamicamente a sessão de testes em memória.
    """
    import sys
    if "pytest" in sys.modules:
        for mod_name in ("tests.conftest", "conftest"):
            if mod_name in sys.modules:
                TestingSessionLocal = getattr(sys.modules[mod_name], "TestingSessionLocal", None)
                if TestingSessionLocal:
                    return TestingSessionLocal()
    return _SessionLocal()

class Base(DeclarativeBase):
    pass

# Habilita validação de chaves estrangeiras no SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

# Dependency para obter a sessão do banco
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
