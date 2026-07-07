from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime, timedelta
from app.core.database import get_db
from app.api.dependencies import get_current_user, RoleChecker
from app.models.usuario import User, UserProfile
from app.models.chamado import Ticket, TicketStatus, TransferLog
from app.schemas.chamado import TicketCreate, TicketResponse, TicketConclude, TicketTransfer
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
    
    destination_queue = "TI"
    
    # 2. Gera código sequencial da OS no padrão OS-YYYY-MM-XXXX
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
    
    # 3. Calcula o prazo de entrega final (SLA Deadline)
    sla_deadline = now + timedelta(hours=sla_duration_hours)
    
    # 4. Persiste o chamado no banco de dados
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


@router.post("/chamados/{id}/iniciar", response_model=TicketResponse)
def iniciar_chamado(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserProfile.TECNICO, UserProfile.SUPERVISOR]))
):
    """Transiciona o chamado para EmAtendimento e atribui ao técnico logado."""
    ticket = db.get(Ticket, id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chamado não encontrado")
        
    if ticket.status not in (TicketStatus.ABERTO, TicketStatus.REABERTO):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chamado não pode ser iniciado a partir do status atual"
        )
        
    ticket.status = TicketStatus.EM_ATENDIMENTO
    ticket.started_at = datetime.now()
    ticket.assigned_technician_id = current_user.id
    
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/chamados/{id}/pausar", response_model=TicketResponse)
def pausar_chamado(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserProfile.TECNICO, UserProfile.SUPERVISOR]))
):
    """Pausa o atendimento (status AguardandoPeca) e congela o SLA."""
    ticket = db.get(Ticket, id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chamado não encontrado")
        
    if ticket.status != TicketStatus.EM_ATENDIMENTO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas chamados em atendimento podem ser pausados"
        )
        
    ticket.status = TicketStatus.AGUARDANDO_PECA
    ticket.paused_at = datetime.now()
    ticket.sla_frozen_start = datetime.now()
    
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/chamados/{id}/retomar", response_model=TicketResponse)
def retomar_chamado(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserProfile.TECNICO, UserProfile.SUPERVISOR]))
):
    """Retoma o atendimento (EmAtendimento), descongelando e estendendo o SLA."""
    ticket = db.get(Ticket, id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chamado não encontrado")
        
    if ticket.status != TicketStatus.AGUARDANDO_PECA:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas chamados pausados podem ser retomados"
        )
        
    now = datetime.now()
    if ticket.sla_frozen_start:
        delta = now - ticket.sla_frozen_start
        ticket.sla_paused_seconds += int(delta.total_seconds())
        if ticket.sla_deadline:
            ticket.sla_deadline = ticket.sla_deadline + delta
            
    ticket.status = TicketStatus.EM_ATENDIMENTO
    ticket.sla_frozen_start = None
    
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/chamados/{id}/concluir", response_model=TicketResponse)
def concluir_chamado(
    id: int,
    conclude_data: TicketConclude,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserProfile.TECNICO, UserProfile.SUPERVISOR]))
):
    """Conclui o atendimento (Resolvido), registrando o sumário técnico."""
    ticket = db.get(Ticket, id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chamado não encontrado")
        
    if ticket.status != TicketStatus.EM_ATENDIMENTO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas chamados em atendimento podem ser concluídos"
        )
        
    ticket.status = TicketStatus.RESOLVIDO
    ticket.resolved_at = datetime.now()
    ticket.resolution_summary = conclude_data.resolution_summary
    if conclude_data.image_url:
        ticket.image_url = conclude_data.image_url
        
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/chamados/{id}/homologar", response_model=TicketResponse)
def homologar_chamado(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Encerra o chamado (Fechado). Restrito ao solicitante ou supervisores/gerentes."""
    ticket = db.get(Ticket, id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chamado não encontrado")
        
    if current_user.profile not in (UserProfile.SUPERVISOR, UserProfile.GERENTE) and current_user.id != ticket.created_by_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o solicitante do chamado ou um supervisor/gerente podem homologar"
        )
        
    if ticket.status != TicketStatus.RESOLVIDO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas chamados resolvidos podem ser homologados"
        )
        
    ticket.status = TicketStatus.FECHADO
    ticket.closed_at = datetime.now()
    
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/chamados/{id}/reabrir", response_model=TicketResponse)
def reabrir_chamado(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reabre o chamado (Reaberto) para retrabalho. Desvincula o técnico."""
    ticket = db.get(Ticket, id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chamado não encontrado")
        
    if current_user.profile not in (UserProfile.SUPERVISOR, UserProfile.GERENTE) and current_user.id != ticket.created_by_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o solicitante do chamado ou um supervisor/gerente podem reabrir"
        )
        
    if ticket.status != TicketStatus.RESOLVIDO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas chamados resolvidos podem ser reabertos"
        )
        
    ticket.status = TicketStatus.REABERTO
    ticket.reopen_count += 1
    ticket.assigned_technician_id = None
    
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/chamados/{id}/transferir", response_model=TicketResponse)
def transferir_chamado(
    id: int,
    transfer_data: TicketTransfer,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserProfile.SUPERVISOR]))
):
    """Transfere a fila de destino do chamado, desvinculando o técnico e resetando SLA."""
    ticket = db.get(Ticket, id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chamado não encontrado")
        
    log = TransferLog(
        ticket_id=ticket.id,
        transferred_by_id=current_user.id,
        source_technician_id=ticket.assigned_technician_id,
        target_technician_id=None,
        justification=transfer_data.justification
    )
    
    ticket.destination_queue = transfer_data.target_queue
    ticket.assigned_technician_id = None
    ticket.started_at = None
    # Reseta o SLA a partir da transferência
    ticket.sla_deadline = datetime.now() + timedelta(hours=ticket.sla_duration_hours)
    
    db.add(log)
    db.commit()
    db.refresh(ticket)
    return ticket
