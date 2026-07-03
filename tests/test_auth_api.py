import pytest
from fastapi import status
from app.models.usuario import User, UserProfile
from app.core.security import get_password_hash

# Fixture para cadastrar um usuário de teste no banco antes dos testes de API
@pytest.fixture
def test_user(db_session):
    user = User(
        name="Lucas Silva",
        username="lucas@hotel.com.br",
        password_hash=get_password_hash("MinhaSenhaSegura123"),
        department="TI",
        profile=UserProfile.TECNICO,
        must_change_password=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

def test_login_sucesso(client, test_user) -> None:
    """Valida o login de sucesso com credenciais válidas."""
    payload = {
        "username": "lucas@hotel.com.br",
        "password": "MinhaSenhaSegura123"
    }
    response = client.post("/auth/login", json=payload)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    # Valida estrutura do Token
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    
    # Valida estrutura do Usuário retornado
    assert "user" in data
    user_data = data["user"]
    assert user_data["username"] == "lucas@hotel.com.br"
    assert user_data["name"] == "Lucas Silva"
    assert user_data["profile"] == UserProfile.TECNICO.value
    assert user_data["must_change_password"] is True
    
    # Valida a brecha de não vazamento do hash da senha
    assert "password_hash" not in user_data
    assert "password" not in user_data

def test_login_senha_incorreta(client, test_user) -> None:
    """Garante que senhas incorretas são rejeitadas com 401."""
    payload = {
        "username": "lucas@hotel.com.br",
        "password": "SenhaIncorreta123"
    }
    response = client.post("/auth/login", json=payload)
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Usuário ou senha incorretos"

def test_login_usuario_inexistente(client) -> None:
    """Garante que usuários que não existem no banco são rejeitados com 401."""
    payload = {
        "username": "inexistente@hotel.com.br",
        "password": "QualquerSenha123"
    }
    response = client.post("/auth/login", json=payload)
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Usuário ou senha incorretos"

def test_login_case_insensitive(client, test_user) -> None:
    """Valida que o login trata o username de forma case-insensitive."""
    payload = {
        "username": "LUCAS@HOTEL.COM.BR",  # Caixa alta
        "password": "MinhaSenhaSegura123"
    }
    response = client.post("/auth/login", json=payload)
    
    assert response.status_code == status.HTTP_200_OK
    assert "access_token" in response.json()

def test_login_sql_injection(client) -> None:
    """Garante que strings de injeção SQL no username falham com 401 e não quebram a query."""
    payload = {
        "username": "' OR '1'='1' --",
        "password": "QualquerSenha123"
    }
    response = client.post("/auth/login", json=payload)
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_login_dos_username_longo(client) -> None:
    """Garante que usernames excessivamente longos (>100 char) são rejeitados no Pydantic."""
    payload = {
        "username": "a" * 101,  # Limite máximo é 100
        "password": "SenhaSegura123"
    }
    response = client.post("/auth/login", json=payload)
    
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_login_dos_senha_longa(client) -> None:
    """Garante que senhas excessivamente longas (>50 char) são rejeitadas no Pydantic."""
    payload = {
        "username": "lucas@hotel.com.br",
        "password": "s" * 51  # Limite máximo é 50
    }
    response = client.post("/auth/login", json=payload)
    
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_login_campos_invalidos(client) -> None:
    """Garante que payloads vazios ou incompletos falham com 422."""
    response = client.post("/auth/login", json={})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
