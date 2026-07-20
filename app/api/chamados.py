import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
from app.core.database import get_db
from app.api.dependencies import get_current_user, RoleChecker
from app.models.usuario import User, UserProfile
from app.models.chamado import Ticket, TicketStatus, TransferLog
from app.schemas.chamado import TicketCreate, TicketResponse, TicketConclude, TicketTransfer
from app.services.sla_service import calculate_sla_and_priority
from app.services.pdf_service import generate_ticket_pdf
from app.services.email_service import (
    send_email_in_background,
    notify_ticket_created,
    notify_ticket_resolved
)

router = APIRouter(tags=["Chamados"])

@router.post("/chamados", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def criar_chamado(
    ticket_data: TicketCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Abre um novo chamado de TI no sistema.
    Calcula automaticamente a prioridade, SLA de atendimento e fila de destino.
    Gera o código sequencial único da OS no formato OS-YYYY-MM-XXXX com tratamento de concorrência.
    """
    now = datetime.now()
    
    # Executa em loop de retentativas para contornar colisões de chaves sob alta concorrência
    for tentativa in range(5):
        priority, sla_duration_hours = calculate_sla_and_priority(
            location_type=ticket_data.location_type,
            is_room_occupied=ticket_data.is_room_occupied,
            subcategory=ticket_data.subcategory
        )
        
        destination_queue = "TI"
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
                next_suffix = last_suffix + 1 + tentativa
            except ValueError:
                next_suffix = 1 + tentativa
        else:
            next_suffix = 1 + tentativa
            
        code = f"{prefix}{next_suffix:04d}"
        sla_deadline = now + timedelta(hours=sla_duration_hours)
        
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
        
        try:
            db.add(novo_chamado)
            db.commit()
            db.refresh(novo_chamado)
            background_tasks.add_task(send_email_in_background, *notify_ticket_created(novo_chamado))
            return novo_chamado
        except IntegrityError:
            db.rollback()
            # Se atingir o limite máximo de tentativas
            if tentativa == 4:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Falha ao gerar código de OS sob alta concorrência"
                )


@router.get("/chamados", response_model=list[TicketResponse])
def listar_chamados(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista os chamados do sistema aplicando regras de visibilidade (RBAC):
    - Supervisor/Gerente: enxerga todos os chamados.
    - Técnico: enxerga chamados na fila de TI ou atribuídos a ele.
    - Cliente: enxerga apenas chamados abertos por ele próprio.
    """
    if current_user.profile == UserProfile.SUPERVISOR:
        stmt = select(Ticket).order_by(Ticket.created_at.desc())
    elif current_user.profile == UserProfile.TECNICO:
        stmt = (
            select(Ticket)
            .where(
                (Ticket.destination_queue == "TI") |
                (Ticket.assigned_technician_id == current_user.id)
            )
            .order_by(Ticket.created_at.desc())
        )
    else:
        stmt = (
            select(Ticket)
            .where(Ticket.created_by_id == current_user.id)
            .order_by(Ticket.created_at.desc())
        )
        
    result = db.execute(stmt)
    return result.scalars().all()


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
    """Pausa o atendimento (status AguardandoPeca) e congela o SLA. Apenas o técnico designado ou supervisor podem fazer."""
    ticket = db.get(Ticket, id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chamado não encontrado")
        
    # Valida posse do chamado para evitar controle de outros técnicos
    if current_user.profile != UserProfile.SUPERVISOR and ticket.assigned_technician_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o técnico designado ou supervisor podem gerenciar este chamado"
        )
        
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
    """Retoma o atendimento (EmAtendimento). Apenas o técnico designado ou supervisor podem fazer."""
    ticket = db.get(Ticket, id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chamado não encontrado")
        
    # Valida posse do chamado
    if current_user.profile != UserProfile.SUPERVISOR and ticket.assigned_technician_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o técnico designado ou supervisor podem gerenciar este chamado"
        )
        
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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserProfile.TECNICO, UserProfile.SUPERVISOR]))
):
    """Conclui o chamado (Resolvido). Apenas o técnico designado ou supervisor podem fazer."""
    ticket = db.get(Ticket, id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chamado não encontrado")
        
    # Valida posse do chamado
    if current_user.profile != UserProfile.SUPERVISOR and ticket.assigned_technician_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o técnico designado ou supervisor podem gerenciar este chamado"
        )
        
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
    background_tasks.add_task(
        send_email_in_background,
        *notify_ticket_resolved(ticket, ticket.solicitante.username)
    )
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
        
    if current_user.profile != UserProfile.SUPERVISOR and current_user.id != ticket.created_by_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o solicitante do chamado ou um supervisor podem homologar"
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
    """Reabre o chamado (Reaberto) limpando os timestamps de atendimento anteriores para novo ciclo."""
    ticket = db.get(Ticket, id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chamado não encontrado")
        
    if current_user.profile != UserProfile.SUPERVISOR and current_user.id != ticket.created_by_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o solicitante do chamado ou um supervisor podem reabrir"
        )
        
    if ticket.status != TicketStatus.RESOLVIDO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas chamados resolvidos podem ser reabertos"
        )
        
    ticket.status = TicketStatus.REABERTO
    ticket.reopen_count += 1
    ticket.assigned_technician_id = None
    
    # Reseta os timestamps de atendimento para que o novo ciclo se inicie limpo
    ticket.started_at = None
    ticket.paused_at = None
    ticket.resolved_at = None
    ticket.sla_paused_seconds = 0
    ticket.sla_frozen_start = None
    
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
    """Transfere a fila de destino do chamado, desvinculando o técnico e resetando/zerando pausas de SLA."""
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
    
    # Zera as pausas anteriores no transbordo
    ticket.sla_paused_seconds = 0
    ticket.sla_frozen_start = None
    
    # Reseta o SLA a partir da transferência
    ticket.sla_deadline = datetime.now() + timedelta(hours=ticket.sla_duration_hours)
    
    db.add(log)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/chamados/{id}/os/download")
def download_os_pdf(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Gera e faz o download da Ordem de Serviço (OS) formatada em PDF."""
    ticket = db.get(Ticket, id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chamado não encontrado")
        
    pdf_buffer = generate_ticket_pdf(ticket)
    filename = f"OS_{ticket.code}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/chamados/upload")
def upload_foto(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Realiza o upload de imagem de evidência de chamado.
    Salva no diretório de uploads e retorna o caminho estático público.
    """
    uploads_dir = "/app/static/uploads"
    os.makedirs(uploads_dir, exist_ok=True)
    
    # Valida formato de imagem básico
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de arquivo inválido. Apenas imagens são permitidas."
        )
    
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(uploads_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            content = file.file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar arquivo no servidor: {str(e)}"
        )
        
    return {"image_url": f"/static/uploads/{unique_filename}"}
