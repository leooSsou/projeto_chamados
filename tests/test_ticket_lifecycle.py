import pytest
from datetime import datetime, timedelta
from fastapi import status
from sqlalchemy import select
from app.models.usuario import User, UserProfile
from app.models.chamado import Ticket, TicketStatus, TransferLog
from app.core.security import get_password_hash

@pytest.fixture
def supervisor_headers(client, db_session):
    user = User(
        name="Chefe TI",
        username="supervisor.ti@hotel.com.br",
        password_hash=get_password_hash("Supervisor123"),
        department="TI",
        profile=UserProfile.SUPERVISOR,
        must_change_password=False
    )
    db_session.add(user)
    db_session.commit()
    
    payload = {"username": "supervisor.ti@hotel.com.br", "password": "Supervisor123"}
    response = client.post("/auth/login", json=payload)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def tech_headers(client, db_session):
    user = User(
        name="Técnico TI",
        username="tecnico.ti@hotel.com.br",
        password_hash=get_password_hash("Tech123"),
        department="TI",
        profile=UserProfile.TECNICO,
        must_change_password=False
    )
    db_session.add(user)
    db_session.commit()
    
    payload = {"username": "tecnico.ti@hotel.com.br", "password": "Tech123"}
    response = client.post("/auth/login", json=payload)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def client_user(db_session):
    user = User(
        name="Maria Recepção",
        username="maria@hotel.com.br",
        password_hash=get_password_hash("Recepcao123"),
        department="Recepção",
        profile=UserProfile.CLIENTE,
        must_change_password=False
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def client_headers(client, client_user):
    payload = {"username": "maria@hotel.com.br", "password": "Recepcao123"}
    response = client.post("/auth/login", json=payload)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def open_ticket(db_session, client_user):
    ticket = Ticket(
        code="OS-2026-07-9999",
        created_by_id=client_user.id,
        status=TicketStatus.ABERTO,
        location_type="Quarto",
        location_details="101",
        is_room_occupied=True,
        category="Tecnologia",
        subcategory="Wi-Fi",
        description="Wi-Fi instável",
        priority="Alta",
        destination_queue="TI",
        sla_duration_hours=2.0,
        sla_deadline=datetime.now() + timedelta(hours=2)
    )
    db_session.add(ticket)
    db_session.commit()
    db_session.refresh(ticket)
    return ticket

def test_ciclo_vida_fluxo_feliz(client, tech_headers, client_headers, open_ticket, db_session) -> None:
    """Valida fluxo feliz de ciclo de vida: Iniciar -> Pausar -> Retomar -> Concluir -> Homologar."""
    ticket_id = open_ticket.id
    
    # 1. Técnico Inicia
    res = client.post(f"/chamados/{ticket_id}/iniciar", headers=tech_headers)
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["status"] == "EmAtendimento"
    assert res.json()["started_at"] is not None
    assert res.json()["assigned_technician_id"] is not None
    
    # 2. Técnico Pausa
    res = client.post(f"/chamados/{ticket_id}/pausar", headers=tech_headers)
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["status"] == "AguardandoPeca"
    assert res.json()["sla_frozen_start"] is not None
    
    # 3. Técnico Retoma
    res = client.post(f"/chamados/{ticket_id}/retomar", headers=tech_headers)
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["status"] == "EmAtendimento"
    assert res.json()["sla_frozen_start"] is None
    
    # 4. Técnico Conclui
    conclude_payload = {
        "resolution_summary": "Substituição do roteador Wi-Fi concluída com sucesso.",
        "image_url": "http://evidencia.com/foto.jpg"
    }
    res = client.post(f"/chamados/{ticket_id}/concluir", json=conclude_payload, headers=tech_headers)
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["status"] == "Resolvido"
    assert res.json()["resolved_at"] is not None
    assert res.json()["resolution_summary"] == conclude_payload["resolution_summary"]
    
    # 5. Cliente Homologa (Fecha)
    res = client.post(f"/chamados/{ticket_id}/homologar", headers=client_headers)
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["status"] == "Fechado"
    assert res.json()["closed_at"] is not None

def test_reabrir_chamado_fluxo(client, tech_headers, client_headers, open_ticket, db_session) -> None:
    """Valida fluxo de reabertura após conclusão (retrabalho, incrementa contagem)."""
    ticket_id = open_ticket.id
    
    # Inicia e Conclui
    client.post(f"/chamados/{ticket_id}/iniciar", headers=tech_headers)
    conclude_payload = {"resolution_summary": "Ajuste na antena feito no quarto."}
    client.post(f"/chamados/{ticket_id}/concluir", json=conclude_payload, headers=tech_headers)
    
    # Cliente Reabre
    res = client.post(f"/chamados/{ticket_id}/reabrir", headers=client_headers)
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["status"] == "Reaberto"
    assert res.json()["reopen_count"] == 1
    assert res.json()["assigned_technician_id"] is None  # Remove atribuição do técnico

def test_transferir_chamado_fluxo(client, supervisor_headers, open_ticket, db_session) -> None:
    """Supervisor transfere o chamado para outra fila, gerando log de transferência e estendendo SLA."""
    ticket_id = open_ticket.id
    
    transfer_payload = {
        "target_queue": "Manutenção",
        "justification": "O problema de TI está relacionado a uma fiação elétrica quebrada na tomada."
    }
    res = client.post(f"/chamados/{ticket_id}/transferir", json=transfer_payload, headers=supervisor_headers)
    assert res.status_code == status.HTTP_200_OK
    
    data = res.json()
    assert data["destination_queue"] == "Manutenção"
    assert data["assigned_technician_id"] is None
    
    # Valida que o log de transferência foi persistido no banco
    stmt = select(TransferLog).where(TransferLog.ticket_id == ticket_id)
    logs = db_session.execute(stmt).scalars().all()
    assert len(logs) == 1
    assert logs[0].justification == transfer_payload["justification"]

def test_bloqueios_permissao_ciclo_vida(client, tech_headers, client_headers, open_ticket) -> None:
    """Garante regras de RBAC sobre as rotas de transição de chamados."""
    ticket_id = open_ticket.id
    
    # 1. Cliente tenta iniciar chamado (Apenas técnico/supervisor podem iniciar)
    res = client.post(f"/chamados/{ticket_id}/iniciar", headers=client_headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN
    
    # 2. Técnico tenta homologar chamado (Apenas criador/supervisor/gerente podem homologar)
    # Primeiro move para resolvido
    client.post(f"/chamados/{ticket_id}/iniciar", headers=tech_headers)
    conclude_payload = {"resolution_summary": "Ajuste na antena feito no quarto."}
    client.post(f"/chamados/{ticket_id}/concluir", json=conclude_payload, headers=tech_headers)
    
    res = client.post(f"/chamados/{ticket_id}/homologar", headers=tech_headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN
    
    # 3. Técnico tenta transferir chamado (Apenas supervisor pode transferir)
    transfer_payload = {"target_queue": "Manutenção", "justification": "Transferência inválida"}
    res = client.post(f"/chamados/{ticket_id}/transferir", json=transfer_payload, headers=tech_headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN
