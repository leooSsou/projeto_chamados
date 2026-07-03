import pytest
from fastapi import status
from app.models.usuario import User, UserProfile
from app.core.security import get_password_hash

@pytest.fixture
def supervisor_headers(client, db_session):
    # Cadastra o supervisor
    supervisor = User(
        name="Chefe TI",
        username="supervisor@hotel.com.br",
        password_hash=get_password_hash("Supervisor123"),
        department="TI",
        profile=UserProfile.SUPERVISOR,
        must_change_password=False
    )
    db_session.add(supervisor)
    db_session.commit()
    
    # Login para obter token
    payload = {"username": "supervisor@hotel.com.br", "password": "Supervisor123"}
    response = client.post("/auth/login", json=payload)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def tech_headers(client, db_session):
    # Cadastra um técnico
    tech = User(
        name="Técnico João",
        username="tech@hotel.com.br",
        password_hash=get_password_hash("Tech123"),
        department="TI",
        profile=UserProfile.TECNICO,
        must_change_password=False
    )
    db_session.add(tech)
    db_session.commit()
    
    # Login
    payload = {"username": "tech@hotel.com.br", "password": "Tech123"}
    response = client.post("/auth/login", json=payload)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_criar_usuario_sucesso(client, supervisor_headers, db_session) -> None:
    """Valida que o supervisor consegue cadastrar um novo funcionário."""
    payload = {
        "name": "Novo Colaborador",
        "username": "novo@hotel.com.br",
        "password": "SenhaProvisoria123",
        "department": "Recepção",
        "profile": "Cliente"
    }
    response = client.post("/usuarios", json=payload, headers=supervisor_headers)
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["id"] is not None
    assert data["name"] == "Novo Colaborador"
    assert data["username"] == "novo@hotel.com.br"
    assert data["profile"] == "Cliente"
    assert data["must_change_password"] is True  # Senha provisória exige mudança
    
    # Garante que o password_hash não vazou na API
    assert "password_hash" not in data

def test_criar_usuario_duplicado(client, supervisor_headers, db_session) -> None:
    """Garante que o supervisor não consegue cadastrar usuário com username duplicado."""
    payload = {
        "name": "Colaborador Original",
        "username": "duplicado@hotel.com.br",
        "password": "SenhaProvisoria123",
        "department": "Recepção",
        "profile": "Cliente"
    }
    client.post("/usuarios", json=payload, headers=supervisor_headers)
    
    # Segundo cadastro com o mesmo username
    response = client.post("/usuarios", json=payload, headers=supervisor_headers)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Username já cadastrado"

def test_criar_usuario_bloqueia_tecnico(client, tech_headers) -> None:
    """Garante que um Técnico é bloqueado (403 Forbidden) ao tentar criar usuários."""
    payload = {
        "name": "Intruso",
        "username": "intruso@hotel.com.br",
        "password": "SenhaProvisoria123",
        "department": "Recepção",
        "profile": "Cliente"
    }
    response = client.post("/usuarios", json=payload, headers=tech_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_criar_usuario_bloqueia_nao_autenticado(client) -> None:
    """Garante que usuários não autenticados são bloqueados (401 Unauthorized)."""
    payload = {
        "name": "Sem Token",
        "username": "semtoken@hotel.com.br",
        "password": "SenhaProvisoria123",
        "department": "Recepção",
        "profile": "Cliente"
    }
    response = client.post("/usuarios", json=payload)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
