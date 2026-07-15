import os
import pytest
from datetime import datetime, timedelta
from fastapi import status
from sqlalchemy import select
from unittest.mock import patch
from app.models.usuario import User, UserProfile
from app.models.chamado import Ticket, TicketStatus, NotificationLog
from app.core.security import get_password_hash
from app.services.pdf_service import generate_ticket_pdf
from app.services.email_service import send_email_in_background
from app.scripts.cleanup_images import run_image_cleanup, UPLOADS_DIR
from app.scripts.db_backup import run_backup, BACKUPS_DIR

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

@pytest.fixture
def test_ticket(db_session, supervisor_headers):
    _, super_user = supervisor_headers
    ticket = Ticket(
        code="OS-2026-07-1111",
        created_by_id=super_user.id,
        assigned_technician_id=super_user.id,
        status=TicketStatus.EM_ATENDIMENTO,
        location_type="Quarto",
        location_details="202",
        is_room_occupied=True,
        category="Tecnologia",
        subcategory="Wi-Fi",
        description="Wi-Fi instável no quarto do hóspede",
        priority="Alta",
        destination_queue="TI",
        sla_duration_hours=2.0,
        sla_deadline=datetime.now() + timedelta(hours=2),
        created_at=datetime.now()
    )
    db_session.add(ticket)
    db_session.commit()
    db_session.refresh(ticket)
    return ticket

def test_pdf_generation_and_download(client, supervisor_headers, test_ticket) -> None:
    """Valida a geração direta do binário do PDF e o download via endpoint REST."""
    headers, _ = supervisor_headers
    
    # 1. Testa a geração de PDF diretamente via serviço
    pdf_buffer = generate_ticket_pdf(test_ticket)
    assert pdf_buffer is not None
    assert len(pdf_buffer.getvalue()) > 0
    
    # 2. Testa o download via rota GET
    res = client.get(f"/chamados/{test_ticket.id}/os/download", headers=headers)
    assert res.status_code == status.HTTP_200_OK
    assert res.headers["content-type"] == "application/pdf"
    assert f"OS_{test_ticket.code}.pdf" in res.headers["content-disposition"]
    assert len(res.content) > 0

@patch("app.api.chamados.send_email_in_background")
def test_email_background_notifications(mock_send_email, client, supervisor_headers, db_session) -> None:
    """Garante que a abertura e conclusão de chamados disparam e-mails em background."""
    headers, _ = supervisor_headers
    
    # 1. Cria chamado -> Deve enfileirar notificação de criação
    payload = {
        "location_type": "Quarto",
        "location_details": "205",
        "is_room_occupied": True,
        "category": "Tecnologia",
        "subcategory": "TV / VoIP",
        "description": "Telefone mudo"
    }
    res = client.post("/chamados", json=payload, headers=headers)
    assert res.status_code == status.HTTP_201_CREATED
    assert mock_send_email.call_count == 1
    
    ticket_id = res.json()["id"]
    
    # Move para atendimento para poder concluir
    client.post(f"/chamados/{ticket_id}/iniciar", headers=headers)
    
    # 2. Conclui chamado -> Deve enfileirar notificação de conclusão
    conclude_payload = {"resolution_summary": "Reconectado o cabo telefônico atrás da mesa."}
    res = client.post(f"/chamados/{ticket_id}/concluir", json=conclude_payload, headers=headers)
    assert res.status_code == status.HTTP_200_OK
    assert mock_send_email.call_count == 2

def test_smtp_logs_gravacao_banco(db_session, test_ticket) -> None:
    """Valida se a função de background do SMTP registra o log de envio na tabela logs_notificacao."""
    # Chama diretamente a rotina de envio em background
    send_email_in_background(
        ticket_id=test_ticket.id,
        recipient_email="cliente@hotel.com.br",
        subject="Teste de Assunto",
        body_html="<p>Olá Mundo</p>"
    )
    
    # Busca o log gravado no banco de dados
    stmt = select(NotificationLog).where(NotificationLog.ticket_id == test_ticket.id)
    logs = db_session.execute(stmt).scalars().all()
    assert len(logs) == 1
    assert logs[0].recipient_email == "cliente@hotel.com.br"
    assert logs[0].subject == "Teste de Assunto"
    assert logs[0].status == "success"

def test_image_cleanup_script(db_session, supervisor_headers) -> None:
    """Valida a rotina de limpeza de imagens de chamados fechados há mais de 90 dias."""
    _, super_user = supervisor_headers
    
    # Cria uma imagem falsa no disco
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    fake_filename = "foto_antiga_90.jpg"
    fake_filepath = os.path.join(UPLOADS_DIR, fake_filename)
    with open(fake_filepath, "w") as f:
        f.write("dados_falsos_de_imagem")
        
    # Garante que a imagem está no disco
    assert os.path.exists(fake_filepath)
    
    # Cria ticket fechado há 95 dias com o link da imagem
    data_antiga = datetime.now() - timedelta(days=95)
    ticket_antigo = Ticket(
        code="OS-2026-03-0001",
        created_by_id=super_user.id,
        status=TicketStatus.FECHADO,
        location_type="Quarto",
        location_details="206",
        is_room_occupied=False,
        category="Tecnologia",
        subcategory="Wi-Fi",
        description="Problema antigo",
        priority="Média",
        destination_queue="TI",
        image_url=f"/static/uploads/{fake_filename}",
        closed_at=data_antiga
    )
    db_session.add(ticket_antigo)
    db_session.commit()
    db_session.refresh(ticket_antigo)
    
    # Executa a limpeza
    run_image_cleanup()
    
    # Valida se o arquivo sumiu do disco
    assert not os.path.exists(fake_filepath)
    
    # Valida se o banco foi atualizado para None
    db_session.refresh(ticket_antigo)
    assert ticket_antigo.image_url is None

def test_db_backup_script() -> None:
    """Valida se o script de backup SQLite gera arquivos timestamped na pasta backups."""
    # Garante que roda a rotina
    run_backup()
    
    # Valida se existe pelo menos um arquivo backup_*.db na pasta backups
    assert os.path.exists(BACKUPS_DIR)
    files = os.listdir(BACKUPS_DIR)
    backup_files = [f for f in files if f.startswith("backup_") and f.endswith(".db")]
    assert len(backup_files) > 0
