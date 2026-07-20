from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class SystemOption(Base):
    """
    Tabela para armazenar opções dinâmicas do formulário de chamados:
    - category = 'location_type' (Ex: Área Comum, Quarto, Administrativo)
    - category = 'common_area' (Ex: Recepção, Restaurante, Suíte, Bar)
    - category = 'subcategory' (Ex: Wi-Fi, Fechadura Eletrônica, Impressora)
    """
    __tablename__ = "opcoes_sistema"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    category: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
