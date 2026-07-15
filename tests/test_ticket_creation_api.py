import pytest
from datetime import datetime, timedelta
from fastapi import status
from sqlalchemy import select
from app.models.usuario import User, UserProfile
from app.models.chamado import Ticket, TicketStatus, LocationType
from app.core.security import get_password_hash
from app.core.seeder import seed_database # O import do seeder

@pytest.fixture
def recepcionist_headers(client, db_session):
    # Cadastra recepção
    user = User(
        name="Julia Recepção",
        username="recepcao@hotel.com.br",
        password_hash=get_password_hash("Recepcao123"),
        department="Recepção",
        profile=UserProfile.CLIENTE,
        must_change_password=False
    )
    db_session.add(user)
    db_session.commit()
    
    # Login para obter token
    payload = {"username": "recepcao@hotel.com.br", "password": "Recepcao123"}
    response = client.post("/auth/login", json=payload)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_seeder_idempotente(db_session) -> None:
    """Valida que rodar o seeder múltiplas vezes não duplica registros e insere as credenciais corretas."""
    # Roda a primeira vez
    seed_database(db_session)
    
    stmt = select(User)
    users_first = db_session.execute(stmt).scalars().all()
    assert len(users_first) > 0
    
    # Valida que o supervisor de TI está cadastrado com senha temporária
    supervisor_ti = next((u for u in users_first if u.username == "supervisor.ti@hotel.com.br"), None)
    assert supervisor_ti is not None
    assert supervisor_ti.profile == UserProfile.SUPERVISOR
    assert supervisor_ti.must_change_password is True
    
    # Roda a segunda vez
    seed_database(db_session)
    users_second = db_session.execute(stmt).scalars().all()
    
    # Deve conter a mesma quantidade de usuários
    assert len(users_first) == len(users_second)

def test_criar_chamado_padrao_sucesso(client, recepcionist_headers, db_session) -> None:
    """Valida a abertura de um chamado padrão de TI (24h de SLA, prioridade Média)."""
    payload = {
        "location_type": "Área Comum",
        "location_details": "Lobby",
        "is_room_occupied": False,
        "category": "Tecnologia",
        "subcategory": "Computador",
        "description": "Computador da recepção 2 não liga"
    }
    response = client.post("/chamados", json=payload, headers=recepcionist_headers)
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    
    assert data["id"] is not None
    assert data["status"] == "Aberto"
    assert data["priority"] == "Média"
    assert data["destination_queue"] == "TI"
    assert data["sla_duration_hours"] == 24.0
    
    # Valida o padrão do código (OS-YYYY-MM-XXXX)
    now = datetime.now()
    expected_prefix = f"OS-{now.year}-{now.month:02d}-"
    assert data["code"].startswith(expected_prefix)
    assert len(data["code"].split("-")[-1]) == 4  # Termina com sufixo de 4 dígitos (ex: 0001)

    # Valida prazo de expiração do SLA (aproximadamente 24h a partir de agora)
    sla_deadline = datetime.fromisoformat(data["sla_deadline"])
    expected_deadline = datetime.now() + timedelta(hours=24)
    assert abs((sla_deadline - expected_deadline).total_seconds()) < 60  # tolerância de 1 min

def test_criar_chamado_critico_sucesso(client, recepcionist_headers, db_session) -> None:
    """Valida abertura de chamado crítico de TI em quarto ocupado (SLA de 2h, prioridade Alta)."""
    payload = {
        "location_type": "Quarto",
        "location_details": "204",
        "is_room_occupied": True,  # Quarto com hóspede!
        "category": "Tecnologia",
        "subcategory": "Wi-Fi",     # Subcategoria crítica de TI!
        "description": "Hóspede sem sinal de Wi-Fi no quarto"
    }
    response = client.post("/chamados", json=payload, headers=recepcionist_headers)
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    
    assert data["priority"] == "Alta"
    assert data["sla_duration_hours"] == 2.0
    
    # Valida prazo de expiração do SLA (aproximadamente 2 horas a partir de agora)
    sla_deadline = datetime.fromisoformat(data["sla_deadline"])
    expected_deadline = datetime.now() + timedelta(hours=2)
    assert abs((sla_deadline - expected_deadline).total_seconds()) < 60

def test_criar_chamado_sequencialidade_codigo(client, recepcionist_headers, db_session) -> None:
    """Garante que a numeração das OS é sequencial e incremental (0001, 0002, etc.)."""
    payload1 = {
        "location_type": "Área Comum",
        "location_details": "Lobby",
        "is_room_occupied": False,
        "category": "Tecnologia",
        "subcategory": "Computador",
        "description": "Computador 1"
    }
    payload2 = {
        "location_type": "Área Comum",
        "location_details": "Lobby",
        "is_room_occupied": False,
        "category": "Tecnologia",
        "subcategory": "Computador",
        "description": "Computador 2"
    }
    
    res1 = client.post("/chamados", json=payload1, headers=recepcionist_headers)
    res2 = client.post("/chamados", json=payload2, headers=recepcionist_headers)
    
    assert res1.status_code == status.HTTP_201_CREATED
    assert res2.status_code == status.HTTP_201_CREATED
    
    code1 = res1.json()["code"]
    code2 = res2.json()["code"]
    
    suffix1 = int(code1.split("-")[-1])
    suffix2 = int(code2.split("-")[-1])
    
    assert suffix2 == suffix1 + 1

def test_criar_chamado_bloqueia_nao_autenticado(client) -> None:
    """Garante que rotas de chamados exigem autenticação válida (401)."""
    payload = {
        "location_type": "Área Comum",
        "location_details": "Lobby",
        "is_room_occupied": False,
        "category": "Tecnologia",
        "subcategory": "Computador",
        "description": "Sem Token"
    }
    response = client.post("/chamados", json=payload)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
