from datetime import datetime
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.models.usuario import User, UserProfile
from app.models.chamado import Ticket, TicketStatus, LocationType, TransferLog, Comment, NotificationLog
from app.core.security import get_password_hash

@pytest.fixture
def test_client_user(db_session):
    user = User(
        name="Cliente Maria",
        username="maria@hotel.com.br",
        password_hash=get_password_hash("Maria123"),
        department="Recepção",
        profile=UserProfile.CLIENTE
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_tech_user(db_session):
    user = User(
        name="Técnico João",
        username="joao@hotel.com.br",
        password_hash=get_password_hash("Joao123"),
        department="TI",
        profile=UserProfile.TECNICO
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

def test_criar_chamado_defaults(db_session, test_client_user) -> None:
    """Garante que o chamado nasce com valores padrão corretos."""
    ticket = Ticket(
        code="OS-2026-07-0001",
        created_by_id=test_client_user.id,
        location_type=LocationType.QUARTO,
        location_details="101",
        is_room_occupied=True,
        category="Tecnologia",
        subcategory="Wi-Fi",
        description="Wi-Fi não funciona no quarto 101"
    )
    db_session.add(ticket)
    db_session.commit()
    db_session.refresh(ticket)
    
    assert ticket.id is not None
    assert ticket.status == TicketStatus.ABERTO
    assert ticket.reopen_count == 0
    assert ticket.sla_paused_seconds == 0
    assert ticket.image_url is None
    assert ticket.resolution_summary is None
    assert isinstance(ticket.created_at, datetime)
    assert ticket.started_at is None
    assert ticket.paused_at is None
    assert ticket.resolved_at is None
    assert ticket.closed_at is None

def test_chamado_relacionamento_usuario(db_session, test_client_user) -> None:
    """Garante que os relacionamentos bidirecionais com usuários funcionam no ORM."""
    ticket = Ticket(
        code="OS-2026-07-0002",
        created_by_id=test_client_user.id,
        location_type=LocationType.QUARTO,
        location_details="102",
        is_room_occupied=False,
        category="Tecnologia",
        subcategory="Fechadura Eletrônica",
        description="Fechadura falhando"
    )
    db_session.add(ticket)
    db_session.commit()
    
    db_session.refresh(test_client_user)
    assert len(test_client_user.chamados_criados) == 1
    assert test_client_user.chamados_criados[0].code == "OS-2026-07-0002"

def test_chamado_campos_obrigatorios(db_session, test_client_user) -> None:
    """Garante que o banco de dados impede valores nulos nos campos obrigatórios."""
    with pytest.raises(IntegrityError):
        ticket = Ticket(
            code="OS-2026-07-0003",
            created_by_id=test_client_user.id,
            location_type=LocationType.QUARTO,
            location_details=None,  # Obrigatório!
            is_room_occupied=False,
            category="Tecnologia",
            subcategory="Outros",
            description="Descrição curta"
        )
        db_session.add(ticket)
        db_session.commit()

def test_chamado_codigo_duplicado(db_session, test_client_user) -> None:
    """Garante que o banco de dados impede cadastros com código de OS duplicado."""
    ticket1 = Ticket(
        code="OS-2026-07-DUPLICADO",
        created_by_id=test_client_user.id,
        location_type=LocationType.QUARTO,
        location_details="103",
        is_room_occupied=False,
        category="Tecnologia",
        subcategory="Outros",
        description="Descrição 1"
    )
    db_session.add(ticket1)
    db_session.commit()
    
    with pytest.raises(IntegrityError):
        ticket2 = Ticket(
            code="OS-2026-07-DUPLICADO",  # Código duplicado!
            created_by_id=test_client_user.id,
            location_type=LocationType.QUARTO,
            location_details="104",
            is_room_occupied=False,
            category="Tecnologia",
            subcategory="Outros",
            description="Descrição 2"
        )
        db_session.add(ticket2)
        db_session.commit()

def test_chamado_foreign_keys_invalidas(db_session) -> None:
    """Garante que restrições de chave estrangeira bloqueiam usuários inexistentes."""
    with pytest.raises(IntegrityError):
        ticket = Ticket(
            code="OS-2026-07-0004",
            created_by_id=99999,  # ID inexistente no banco
            location_type=LocationType.QUARTO,
            location_details="105",
            is_room_occupied=False,
            category="Tecnologia",
            subcategory="Outros",
            description="Descrição"
        )
        db_session.add(ticket)
        db_session.commit()

def test_chamado_status_invalido(db_session, test_client_user) -> None:
    """Garante que o validador do modelo barra status inválidos."""
    with pytest.raises(ValueError):
        Ticket(
            code="OS-2026-07-0005",
            created_by_id=test_client_user.id,
            location_type=LocationType.QUARTO,
            location_details="106",
            is_room_occupied=False,
            category="Tecnologia",
            subcategory="Outros",
            description="Descrição",
            status="SuperAberto"  # Status inválido
        )

def test_chamado_local_invalido(db_session, test_client_user) -> None:
    """Garante que o validador barra tipos de local inválidos."""
    with pytest.raises(ValueError):
        Ticket(
            code="OS-2026-07-0006",
            created_by_id=test_client_user.id,
            location_type="Céu",  # type: ignore # Local inválido
            location_details="107",
            is_room_occupied=False,
            category="Tecnologia",
            subcategory="Outros",
            description="Descrição"
        )

def test_chamado_pausa_negativa(db_session, test_client_user) -> None:
    """Garante que o validador impede tempos de pausa de SLA negativos."""
    with pytest.raises(ValueError):
        Ticket(
            code="OS-2026-07-0007",
            created_by_id=test_client_user.id,
            location_type=LocationType.QUARTO,
            location_details="108",
            is_room_occupied=False,
            category="Tecnologia",
            subcategory="Outros",
            description="Descrição",
            sla_paused_seconds=-100  # Valor negativo inválido
        )

def test_chamado_reaberturas_negativas(db_session, test_client_user) -> None:
    """Garante que o validador impede contadores de reaberturas negativos."""
    with pytest.raises(ValueError):
        Ticket(
            code="OS-2026-07-0008",
            created_by_id=test_client_user.id,
            location_type=LocationType.QUARTO,
            location_details="109",
            is_room_occupied=False,
            category="Tecnologia",
            subcategory="Outros",
            description="Descrição",
            reopen_count=-1  # Contador negativo inválido
        )

def test_comentario_restricoes(db_session, test_client_user) -> None:
    """Garante regras físicas para comentários (not null para conteúdo e chaves válidas)."""
    ticket = Ticket(
        code="OS-2026-07-0009",
        created_by_id=test_client_user.id,
        location_type=LocationType.QUARTO,
        location_details="110",
        is_room_occupied=False,
        category="Tecnologia",
        subcategory="Outros",
        description="Descrição"
    )
    db_session.add(ticket)
    db_session.commit()
    
    # Comentário válido
    comentario = Comment(
        ticket_id=ticket.id,
        author_id=test_client_user.id,
        content="Comentário válido"
    )
    db_session.add(comentario)
    db_session.commit()
    assert comentario.id is not None
    
    # Comentário sem conteúdo (nulo) deve falhar
    with pytest.raises(IntegrityError):
        comentario_invalido = Comment(
            ticket_id=ticket.id,
            author_id=test_client_user.id,
            content=None  # type: ignore # Conteúdo nulo inválido
        )
        db_session.add(comentario_invalido)
        db_session.commit()

def test_log_transferencia_restricoes(db_session, test_client_user, test_tech_user) -> None:
    """Garante regras físicas para logs de transferência (justificativa obrigatória)."""
    ticket = Ticket(
        code="OS-2026-07-0010",
        created_by_id=test_client_user.id,
        location_type=LocationType.QUARTO,
        location_details="111",
        is_room_occupied=False,
        category="Tecnologia",
        subcategory="Outros",
        description="Descrição"
    )
    db_session.add(ticket)
    db_session.commit()
    
    # Log válido
    log = TransferLog(
        ticket_id=ticket.id,
        transferred_by_id=test_tech_user.id,
        source_technician_id=test_tech_user.id,
        target_technician_id=None,
        justification="Transferência operacional"
    )
    db_session.add(log)
    db_session.commit()
    assert log.id is not None
    
    # Log sem justificativa deve falhar
    with pytest.raises(IntegrityError):
        log_invalido = TransferLog(
            ticket_id=ticket.id,
            transferred_by_id=test_tech_user.id,
            justification=None  # type: ignore # Justificativa nula inválida
        )
        db_session.add(log_invalido)
        db_session.commit()

def test_delecao_cascata_chamado(db_session, test_client_user, test_tech_user) -> None:
    """Garante deleção em cascata para logs, comentários e notificações ao excluir o chamado."""
    ticket = Ticket(
        code="OS-2026-07-CASCATA",
        created_by_id=test_client_user.id,
        location_type=LocationType.QUARTO,
        location_details="112",
        is_room_occupied=False,
        category="Tecnologia",
        subcategory="Outros",
        description="Descrição"
    )
    db_session.add(ticket)
    db_session.commit()
    
    # Adiciona dados vinculados
    comentario = Comment(ticket_id=ticket.id, author_id=test_client_user.id, content="Teste")
    db_session.add(comentario)
    
    log = TransferLog(ticket_id=ticket.id, transferred_by_id=test_tech_user.id, justification="Teste")
    db_session.add(log)
    
    notif = NotificationLog(ticket_id=ticket.id, recipient_email="maria@hotel.com.br", subject="Teste", status="success")
    db_session.add(notif)
    
    db_session.commit()
    
    # Deleta o ticket
    db_session.delete(ticket)
    db_session.commit()
    
    # Garante que os registros vinculados foram apagados em cascata automaticamente pelo banco
    stmt_comentarios = select(Comment).where(Comment.ticket_id == ticket.id)
    comentarios = db_session.execute(stmt_comentarios).scalars().all()
    assert len(comentarios) == 0
    
    stmt_logs = select(TransferLog).where(TransferLog.ticket_id == ticket.id)
    logs = db_session.execute(stmt_logs).scalars().all()
    assert len(logs) == 0
    
    stmt_notifs = select(NotificationLog).where(NotificationLog.ticket_id == ticket.id)
    notifs = db_session.execute(stmt_notifs).scalars().all()
    assert len(notifs) == 0
