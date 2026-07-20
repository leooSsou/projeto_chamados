import pytest
from app.models.usuario import User, UserProfile
from app.core.security import get_password_hash, create_access_token

def test_get_system_options(client, db_session):
    """Valida que o endpoint GET /opcoes inicializa os dados padrão e retorna as opções do sistema."""
    supervisor = User(
        name="Supervisor Teste",
        username="super.opcoes@hotel.com.br",
        password_hash=get_password_hash("Senha123"),
        department="TI",
        profile=UserProfile.SUPERVISOR,
        must_change_password=False
    )
    db_session.add(supervisor)
    db_session.commit()

    token = create_access_token({"sub": supervisor.username})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/opcoes", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "location_types" in data
    assert "common_areas" in data
    assert "subcategories" in data
    assert len(data["subcategories"]) >= 1

def test_create_and_delete_system_option(client, db_session):
    """Valida o cadastro e remoção de uma nova subcategoria de TI pelo Supervisor."""
    supervisor = User(
        name="Supervisor de TI",
        username="super.crud@hotel.com.br",
        password_hash=get_password_hash("Senha123"),
        department="TI",
        profile=UserProfile.SUPERVISOR,
        must_change_password=False
    )
    db_session.add(supervisor)
    db_session.commit()

    token = create_access_token({"sub": supervisor.username})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Adiciona nova subcategoria
    payload = {"category": "subcategory", "name": "Impressora POS Fiscal"}
    create_res = client.post("/opcoes", json=payload, headers=headers)
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]

    # 2. Deleta a subcategoria criada
    del_res = client.delete(f"/opcoes/{created_id}", headers=headers)
    assert del_res.status_code == 204
