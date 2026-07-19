import pytest
from fastapi import status
from sqlalchemy import select
from app.models.usuario import User, UserProfile
from app.core.security import get_password_hash

@pytest.fixture
def supervisor_headers(client, db_session):
    user = User(
        name="Chefe TI",
        username="super@hotel.com.br",
        password_hash=get_password_hash("Super123"),
        department="TI",
        profile=UserProfile.SUPERVISOR,
        must_change_password=False
    )
    db_session.add(user)
    db_session.commit()
    
    payload = {"username": "super@hotel.com.br", "password": "Super123"}
    res = client.post("/auth/login", json=payload)
    return {"Authorization": f"Bearer {res.json()['access_token']}"}, user

@pytest.fixture
def tech_headers(client, db_session):
    user = User(
        name="Tech Operacional",
        username="tech@hotel.com.br",
        password_hash=get_password_hash("Tech123"),
        department="TI",
        profile=UserProfile.TECNICO,
        must_change_password=False
    )
    db_session.add(user)
    db_session.commit()
    
    payload = {"username": "tech@hotel.com.br", "password": "Tech123"}
    res = client.post("/auth/login", json=payload)
    return {"Authorization": f"Bearer {res.json()['access_token']}"}, user

def test_obter_configuracao_smtp_rbac(client, supervisor_headers, tech_headers, db_session) -> None:
    """Valida que qualquer usuário autenticado (incluindo Técnico) consegue acessar suas configurações de SMTP."""
    super_headers, _ = supervisor_headers
    t_headers, _ = tech_headers

    # 1. Supervisor deve conseguir acessar (Status 200)
    res_super = client.get("/configuracoes/smtp", headers=super_headers)
    assert res_super.status_code == status.HTTP_200_OK
    assert "smtp_host" in res_super.json()
    assert "smtp_port" in res_super.json()

    # 2. Técnico também deve conseguir acessar suas próprias configs agora (Status 200)
    res_tech = client.get("/configuracoes/smtp", headers=t_headers)
    assert res_tech.status_code == status.HTTP_200_OK

    # 3. Cliente comum também deve conseguir acessar (Status 200)
    cliente = User(
        name="Hóspede",
        username="hospede.config@hotel.com.br",
        password_hash=get_password_hash("Senha123"),
        department="Recepção",
        profile=UserProfile.CLIENTE,
        must_change_password=False
    )
    db_session.add(cliente)
    db_session.commit()

    payload = {"username": "hospede.config@hotel.com.br", "password": "Senha123"}
    login_res = client.post("/auth/login", json=payload)
    c_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    res_cliente = client.get("/configuracoes/smtp", headers=c_headers)
    assert res_cliente.status_code == status.HTTP_200_OK


def test_atualizar_configuracao_smtp(client, supervisor_headers, db_session) -> None:
    """Valida se a atualização de SMTP persiste as informações corretamente no modelo User."""
    headers, super_user = supervisor_headers

    payload = {
        "smtp_host": "smtp.novo-servidor.com",
        "smtp_port": 465,
        "smtp_user": "novo_usuario_smtp",
        "smtp_password": "nova_senha_secreta"
    }

    res = client.put("/configuracoes/smtp", json=payload, headers=headers)
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["smtp_host"] == "smtp.novo-servidor.com"
    assert res.json()["smtp_port"] == 465
    assert res.json()["smtp_user"] == "novo_usuario_smtp"
    assert res.json()["has_password"] is True

    # Valida no banco de dados
    db_session.refresh(super_user)
    assert super_user.smtp_password == "nova_senha_secreta"

    # Testa preservação da senha informando o placeholder de senha
    payload_placeholder = {
        "smtp_host": "smtp.novo-servidor.com",
        "smtp_port": 465,
        "smtp_user": "novo_usuario_smtp",
        "smtp_password": "••••••••" # placeholder padrão
    }

    res_placeholder = client.put("/configuracoes/smtp", json=payload_placeholder, headers=headers)
    assert res_placeholder.status_code == status.HTTP_200_OK
    db_session.refresh(super_user)
    # A senha não deve ter sido substituída pelo placeholder literal
    assert super_user.smtp_password == "nova_senha_secreta"
