from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

# Import do Base e dos modelos do banco para suporte a autogenerate
from app.core.database import Base
from app.models.usuario import User
from app.models.chamado import Ticket, TransferLog, Comment, NotificationLog
from app.models.configuracao import SystemOption
from app.core.config import settings

# Obtém o objeto de configuração do Alembic
config = context.config

# Define a URL do banco de dados dinamicamente a partir das variáveis de ambiente/Docker
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Configuração de Logs
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Configura o target_metadata para apontar para a nossa base de dados registrada
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Executa as migrações em modo offline (geração de scripts SQL)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Executa as migrações em modo online (com conexão ativa no banco)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
