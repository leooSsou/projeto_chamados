import pytest
from datetime import datetime, timedelta
from fastapi import status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.models.usuario import User, UserProfile
from app.models.chamado import Ticket, TicketStatus
from app.core.security import get_password_hash

@pytest.fixture
def tech_a_headers(client, db_session):
    user = User(
        name="Técnico A",
        username="tech.a@hotel.com.br",
        password_hash=get_password_hash("TechA123"),
        department="TI",
        profile=UserProfile.TECNICO,
        must_change_password=False
    )
    db_session.add(user)
    db_session.commit()
    
    payload = {"username": "tech.a@hotel.com.br", "password": "TechA123"}
    res = client.post("/auth/login", json=payload)
    return {"Authorization": f"Bearer {res.json()['access_token']}"}, user

@pytest.fixture
def tech_b_headers(client, db_session):
    user = User(
        name="Técnico B",
        username="tech.b@hotel.com.br",
        password_hash=get_password_hash("TechB123"),
        department="TI",
        profile=UserProfile.TECNICO,
        must_change_password=False
    )
    db_session.add(user)
    db_session.commit()
    
    payload = {"username": "tech.b@hotel.com.br", "password": "TechB123"}
    res = client.post("/auth/login", json=payload)
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

@pytest.fixture
def supervisor_headers(client, db_session):
    user = User(
        name="Supervisor TI",
        username="supervisor.ti@hotel.com.br",
        password_hash=get_password_hash("Supervisor123"),
        department="TI",
        profile=UserProfile.SUPERVISOR,
        must_change_password=False
    )
    db_session.add(user)
    db_session.commit()
    
    payload = {"username": "supervisor.ti@hotel.com.br", "password": "Supervisor123"}
    res = client.post("/auth/login", json=payload)
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

@pytest.fixture
def client_headers(client, db_session):
    user = User(
        name="Julia Recepção",
        username="julia@hotel.com.br",
        password_hash=get_password_hash("Julia123"),
        department="Recepção",
        profile=UserProfile.CLIENTE,
        must_change_password=False
    )
    db_session.add(user)
    db_session.commit()
    
    payload = {"username": "julia@hotel.com.br", "password": "Julia123"}
    res = client.post("/auth/login", json=payload)
    return {"Authorization": f"Bearer {res.json()['access_token']}"}, user

@pytest.fixture
def assigned_ticket(db_session, client_headers, tech_a_headers):
    _, client_user = client_headers
    _, tech_a = tech_a_headers
    ticket = Ticket(
        code="OS-2026-07-5555",
        created_by_id=client_user.id,
        assigned_technician_id=tech_a.id,
        status=TicketStatus.EM_ATENDIMENTO,
        location_type="Quarto",
        location_details="101",
        is_room_occupied=True,
        category="Tecnologia",
        subcategory="Wi-Fi",
        description="Wi-Fi instável",
        priority="Alta",
        destination_queue="TI",
        sla_duration_hours=2.0,
        sla_deadline=datetime.now() + timedelta(hours=2),
        started_at=datetime.now()
    )
    db_session.add(ticket)
    db_session.commit()
    db_session.refresh(ticket)
    return ticket

def test_bloqueio_tecnico_estranho_lifecycle(client, tech_b_headers, supervisor_headers, assigned_ticket) -> None:
    """Garante que um Técnico B não consegue pausar, retomar ou concluir chamados do Técnico A."""
    ticket_id = assigned_ticket.id
    
    # Técnico B tenta pausar -> Bloqueado
    res = client.post(f"/chamados/{ticket_id}/pausar", headers=tech_b_headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN
    
    # Supervisor tenta pausar -> Permitido (Supervisor tem controle administrativo)
    res = client.post(f"/chamados/{ticket_id}/pausar", headers=supervisor_headers)
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["status"] == "AguardandoPeca"
    
    # Técnico B tenta retomar -> Bloqueado
    res = client.post(f"/chamados/{ticket_id}/retomar", headers=tech_b_headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN
    
    # Supervisor retoma -> Permitido
    client.post(f"/chamados/{ticket_id}/retomar", headers=supervisor_headers)
    
    # Técnico B tenta concluir -> Bloqueado
    conclude_payload = {"resolution_summary": "Técnico B intrometido tentando resolver."}
    res = client.post(f"/chamados/{ticket_id}/concluir", json=conclude_payload, headers=tech_b_headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN

def test_reabertura_limpa_timestamps(client, tech_a_headers, client_headers, assigned_ticket, db_session) -> None:
    """Valida se reabrir o chamado reseta todos os timestamps de atendimento anteriores."""
    ticket_id = assigned_ticket.id
    tech_headers, _ = tech_a_headers
    cli_headers, _ = client_headers
    
    # Técnico A conclui o chamado
    conclude_payload = {"resolution_summary": "Roteador trocado e sinal normalizado."}
    client.post(f"/chamados/{ticket_id}/concluir", json=conclude_payload, headers=tech_headers)
    
    # Garante que os timestamps estão preenchidos
    db_session.refresh(assigned_ticket)
    assert assigned_ticket.started_at is not None
    assert assigned_ticket.resolved_at is not None
    
    # Cliente reabre o chamado
    res = client.post(f"/chamados/{ticket_id}/reabrir", headers=cli_headers)
    assert res.status_code == status.HTTP_200_OK
    
    data = res.json()
    assert data["status"] == "Reaberto"
    assert data["started_at"] is None
    assert data["paused_at"] is None
    assert data["resolved_at"] is None
    assert data["sla_paused_seconds"] == 0
    assert data["sla_frozen_start"] is None

def test_abertura_subcategoria_invalida(client, client_headers) -> None:
    """Garante que subcategorias fora da lista estrita de TI são bloqueadas com 422."""
    headers, _ = client_headers
    payload = {
        "location_type": "Quarto",
        "location_details": "104",
        "is_room_occupied": True,
        "category": "Tecnologia",
        "subcategory": "Liquidificador",  # Inválido!
        "description": "Fiação com fumaça"
    }
    res = client.post("/chamados", json=payload, headers=headers)
    assert res.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_transferir_fila_invalida(client, supervisor_headers, assigned_ticket) -> None:
    """Garante que transferir para uma fila inexistente é bloqueado no Pydantic (422) e não estoura 500."""
    ticket_id = assigned_ticket.id
    transfer_payload = {
        "target_queue": "Faturamento",  # Fila inválida!
        "justification": "Transferência operacional de teste"
    }
    res = client.post(f"/chamados/{ticket_id}/transferir", json=transfer_payload, headers=supervisor_headers)
    assert res.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_concorrencia_colisao_codigo(client, client_headers, db_session) -> None:
    """Garante que colisões de código de OS em gravação simultânea são contornadas via retry loop."""
    headers, user = client_headers
    now = datetime.now()
    prefix = f"OS-{now.year}-{now.month:02d}-"
    
    # Simula outra thread salvando a OS-2026-07-0001
    colisao_ticket = Ticket(
        code=f"{prefix}0001",
        created_by_id=user.id,
        status=TicketStatus.ABERTO,
        location_type="Quarto",
        location_details="102",
        is_room_occupied=False,
        category="Tecnologia",
        subcategory="Wi-Fi",
        description="Ticket concorrente",
        priority="Média",
        destination_queue="TI",
        sla_duration_hours=24.0,
        sla_deadline=now + timedelta(hours=24)
    )
    db_session.add(colisao_ticket)
    db_session.commit()
    
    # Tenta abrir chamado. O código sequencial lido inicialmente pelo endpoint seria OS-2026-07-0001 (caso concorrente),
    # mas o banco de dados lançará um IntegrityError por chave duplicada.
    # Nossa lógica deve capturar e re-tentar automaticamente, salvando como OS-2026-07-0002 sem quebrar o request!
    payload = {
        "location_type": "Quarto",
        "location_details": "103",
        "is_room_occupied": False,
        "category": "Tecnologia",
        "subcategory": "Wi-Fi",
        "description": "Meu chamado sob concorrência"
    }
    res = client.post("/chamados", json=payload, headers=headers)
    assert res.status_code == status.HTTP_201_CREATED
    assert res.json()["code"] == f"{prefix}0002"  # Deve automaticamente salvar como 0002!
