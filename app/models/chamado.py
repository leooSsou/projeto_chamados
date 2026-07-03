import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, func, Enum, ForeignKey, Integer, Float, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates
from app.core.database import Base

class TicketStatus(str, enum.Enum):
    ABERTO = "Aberto"
    EM_ATENDIMENTO = "EmAtendimento"
    AGUARDANDO_PECA = "AguardandoPeca"
    RESOLVIDO = "Resolvido"
    FECHADO = "Fechado"
    REABERTO = "Reaberto"

class LocationType(str, enum.Enum):
    QUARTO = "Quarto"
    AREA_COMUM = "Área Comum"

class Ticket(Base):
    __tablename__ = "chamados"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    
    created_by_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    assigned_technician_id: Mapped[Optional[int]] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    
    status: Mapped[TicketStatus] = mapped_column(Enum(TicketStatus), default=TicketStatus.ABERTO, nullable=False)
    location_type: Mapped[LocationType] = mapped_column(Enum(LocationType), nullable=False)
    location_details: Mapped[str] = mapped_column(String(150), nullable=False)
    is_room_occupied: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    category: Mapped[str] = mapped_column(String(100), default="Tecnologia", nullable=False)
    subcategory: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    resolution_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # SLA metrics
    sla_duration_hours: Mapped[float] = mapped_column(Float, default=24.0, nullable=False)
    sla_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sla_frozen_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sla_paused_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reopen_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    paused_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    solicitante = relationship("User", foreign_keys=[created_by_id], back_populates="chamados_criados")
    tecnico_designado = relationship("User", foreign_keys=[assigned_technician_id], back_populates="chamados_designados")
    
    transferencias = relationship("TransferLog", back_populates="ticket", cascade="all, delete-orphan")
    comentarios = relationship("Comment", back_populates="ticket", cascade="all, delete-orphan")
    notificacoes = relationship("NotificationLog", back_populates="ticket", cascade="all, delete-orphan")

    @validates("status")
    def validate_status(self, key: str, value: any) -> TicketStatus:
        if isinstance(value, TicketStatus):
            return value
        if isinstance(value, str):
            try:
                return TicketStatus(value)
            except ValueError:
                try:
                    return TicketStatus[value.upper()]
                except KeyError:
                    pass
        raise ValueError(f"Status de chamado inválido: {value}")

    @validates("location_type")
    def validate_location_type(self, key: str, value: any) -> LocationType:
        if isinstance(value, LocationType):
            return value
        if isinstance(value, str):
            try:
                return LocationType(value)
            except ValueError:
                try:
                    name_mapped = value.upper().replace(" ", "_").replace("Á", "A")
                    return LocationType[name_mapped]
                except KeyError:
                    pass
        raise ValueError(f"Tipo de local inválido: {value}")

    @validates("sla_paused_seconds")
    def validate_sla_paused_seconds(self, key: str, value: int) -> int:
        if value is not None and value < 0:
            raise ValueError("Tempo de pausa de SLA não pode ser negativo")
        return value

    @validates("reopen_count")
    def validate_reopen_count(self, key: str, value: int) -> int:
        if value is not None and value < 0:
            raise ValueError("Contador de reaberturas não pode ser negativo")
        return value

class TransferLog(Base):
    __tablename__ = "logs_transferencia"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("chamados.id", ondelete="CASCADE"), nullable=False)
    transferred_by_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    source_technician_id: Mapped[Optional[int]] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    target_technician_id: Mapped[Optional[int]] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    justification: Mapped[str] = mapped_column(Text, nullable=False)
    transferred_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    ticket = relationship("Ticket", back_populates="transferencias")

class Comment(Base):
    __tablename__ = "comentarios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("chamados.id", ondelete="CASCADE"), nullable=False)
    author_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    ticket = relationship("Ticket", back_populates="comentarios")
    autor = relationship("User")

class NotificationLog(Base):
    __tablename__ = "logs_notificacao"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("chamados.id", ondelete="CASCADE"), nullable=False)
    recipient_email: Mapped[str] = mapped_column(String(100), nullable=False)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False) # success, failed

    ticket = relationship("Ticket", back_populates="notificacoes")
