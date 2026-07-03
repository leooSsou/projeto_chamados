import enum
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, func, Enum
from sqlalchemy.orm import Mapped, mapped_column, validates
from app.core.database import Base

class UserProfile(str, enum.Enum):
    CLIENTE = "Cliente"
    TECNICO = "Técnico"
    SUPERVISOR = "Supervisor"
    GERENTE = "Gerente"

class User(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False) # e-mail ou matrícula
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False) # Ex: Recepção, TI
    
    # Restringe no banco de dados aos valores permitidos no Enum
    profile: Mapped[UserProfile] = mapped_column(Enum(UserProfile), nullable=False)
    
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    @validates("profile")
    def validate_profile(self, key: str, value: any) -> UserProfile:
        """Validador em nível de aplicação para garantir que o perfil seja estritamente um UserProfile válido."""
        if isinstance(value, UserProfile):
            return value
        
        # Se for string, tenta mapear para o valor do Enum (ex: "Cliente") ou para a chave (ex: "CLIENTE")
        if isinstance(value, str):
            try:
                return UserProfile(value)
            except ValueError:
                try:
                    return UserProfile[value.upper()]
                except KeyError:
                    pass
        
        raise ValueError(f"Perfil de usuário inválido: {value}. Deve ser um dos seguintes: {[e.value for e in UserProfile]}")
