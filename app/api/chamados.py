from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime, timedelta
from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.usuario import User
from app.models.chamado import Ticket, TicketStatus
from app.schemas.chamado import TicketCreate, TicketResponse
from app.services.sla_service import calculate_sla_and_priority

router = APIRouter(tags=["Chamados"])

@router.post("/chamados", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def criar_chamado(
    ticket_data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Abre um novo chamado de TI no sistema.
    Calcula automaticamente a prioridade, SLA de atendimento e fila de destino.
    Gera o código sequencial único da OS no formato OS-YYYY-MM-XXXX.
    """
    now = datetime.now()
    
    # 1. Calcula SLA e Prioridade baseada nas regras de negócios de TI
    priority, sla_duration_hours = calculate_sla_and_priority(
        location_type=ticket_data.location_type,
        is_room_occupied=ticket_data.is_room_occupied,
        subcategory=ticket_data.subcategory
    )
    
    # 2. Roteamento automático de fila
    # No MVP, todo chamado gerado por este formulário vai para a fila "TI" (categoria Tecnologia)
    destination_queue = "TI"
    
    # 3. Gera código sequencial da OS no padrão OS-YYYY-MM-XXXX
    prefix = f"OS-{now.year}-{now.month:02d}-"
    
    # Busca a última OS gerada para o mês/ano corrente
    stmt = (
        select(Ticket)
        .where(Ticket.code.like(f"{prefix}%"))
        .order_by(Ticket.code.desc())
        .limit(1)
    )
    result = db.execute(stmt)
    last_ticket = result.scalar_one_or_none()
    
    if last_ticket:
        try:
            last_suffix = int(last_ticket.code.split("-")[-1])
            next_suffix = last_suffix + 1
        except ValueError:
            next_suffix = 1
    else:
        next_suffix = 1
        
    code = f"{prefix}{next_suffix:04d}"
    
    # 4. Calcula o prazo de entrega final (SLA Deadline)
    sla_deadline = now + timedelta(hours=sla_duration_hours)
    
    # 5. Persiste o chamado no banco de dados
    novo_chamado = Ticket(
        code=code,
        created_by_id=current_user.id,
        status=TicketStatus.ABERTO,
        location_type=ticket_data.location_type,
        location_details=ticket_data.location_details,
        is_room_occupied=ticket_data.is_room_occupied,
        category="Tecnologia",
        subcategory=ticket_data.subcategory,
        description=ticket_data.description,
        image_url=ticket_data.image_url,
        priority=priority,
        destination_queue=destination_queue,
        sla_duration_hours=sla_duration_hours,
        sla_deadline=sla_deadline,
        created_at=now
    )
    
    db.add(novo_chamado)
    db.commit()
    db.refresh(novo_chamado)
    
    return novo_chamado
