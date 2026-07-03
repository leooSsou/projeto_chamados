import pytest
from fastapi import status
from app.models.usuario import User, UserProfile
from app.core.security import get_password_hash

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

@pytest.fixture
def auth_headers(client, test_user):
    payload = {
        "username": "lucas@hotel.com.br",
        "password": "MinhaSenhaSegura123"
    }
    response = client.post("/auth/login", json=payload)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_alterar_senha_sucesso(client, test_user, auth_headers, db_session) -> None:
    """Valida a alteração de senha com sucesso, limpando a flag must_change_password."""
    payload = {
        "current_password": "MinhaSenhaSegura123",
        "new_password": "NovaSenhaSuperSegura456"
    }
    response = client.post("/auth/alterar-senha", json=payload, headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "Senha alterada com sucesso"
    
    # Busca usuário no banco para validar se atualizou
    db_session.refresh(test_user)
    assert test_user.must_change_password is False  # Flag deve ser limpa para False
    
    # Valida que a nova senha funciona no login
    login_payload = {
        "username": "lucas@hotel.com.br",
        "password": "NovaSenhaSuperSegura456"
    }
    login_response = client.post("/auth/login", json=login_payload)
    assert login_response.status_code == status.HTTP_200_OK

def test_alterar_senha_atual_incorreta(client, test_user, auth_headers) -> None:
    """Garante que falha caso a senha atual enviada esteja incorreta."""
    payload = {
        "current_password": "SenhaAtualErrada",
        "new_password": "NovaSenhaSuperSegura456"
    }
    response = client.post("/auth/alterar-senha", json=payload, headers=auth_headers)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Senha atual incorreta"

def test_alterar_senha_nao_autenticado(client) -> None:
    """Garante que a rota exige autenticação (token)."""
    payload = {
        "current_password": "QualquerSenha",
        "new_password": "NovaSenha"
    }
    response = client.post("/auth/alterar-senha", json=payload)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
