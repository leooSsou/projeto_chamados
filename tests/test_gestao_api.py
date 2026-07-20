import pytest
from app.models.usuario import User, UserProfile
from app.core.security import get_password_hash, create_access_token

def test_kpis_endpoint_acesso_supervisor(client, db_session):
    """Garante que usuário com perfil Supervisor consegue acessar o endpoint de KPIs de Gestão."""
    supervisor = User(
        name="Supervisor de TI",
        username="supervisor.teste@hotel.com.br",
        password_hash=get_password_hash("Senha123"),
        department="TI",
        profile=UserProfile.SUPERVISOR,
        must_change_password=False
    )
    db_session.add(supervisor)
    db_session.commit()

    token = create_access_token({"sub": supervisor.username})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/gestao/kpis", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "cumprimento_sla_percent" in data
    assert "mttr_medio_horas" in data
    assert "desempenho_tecnicos" in data

def test_kpis_endpoint_bloqueio_cliente(client, db_session):
    """Garante que usuários com perfil Cliente são bloqueados (HTTP 403) no endpoint de Gestão."""
    cliente = User(
        name="Cliente Comum",
        username="cliente.teste@hotel.com.br",
        password_hash=get_password_hash("Senha123"),
        department="Recepção",
        profile=UserProfile.CLIENTE,
        must_change_password=False
    )
    db_session.add(cliente)
    db_session.commit()

    token = create_access_token({"sub": cliente.username})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/gestao/kpis", headers=headers)
    assert response.status_code == 403
