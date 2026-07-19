from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.usuario import User
from app.schemas.configuracao import SMTPConfigResponse, SMTPConfigUpdate
from app.core.config import settings

router = APIRouter(tags=["Configurações"])

@router.get("/configuracoes/smtp", response_model=SMTPConfigResponse)
def obter_configuracao_smtp(
    current_user: User = Depends(get_current_user)
):
    """
    Retorna as configurações de SMTP da conta do usuário logado.
    Se o usuário não tiver configurado nada, retorna os fallbacks do sistema (env).
    """
    return {
        "smtp_host": current_user.smtp_host or settings.SMTP_HOST,
        "smtp_port": current_user.smtp_port or settings.SMTP_PORT,
        "smtp_user": current_user.smtp_user or settings.SMTP_USER,
        "has_password": bool(current_user.smtp_password or settings.SMTP_PASSWORD)
    }

@router.put("/configuracoes/smtp", response_model=SMTPConfigResponse)
def atualizar_configuracao_smtp(
    config_data: SMTPConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza as configurações SMTP da conta do usuário logado.
    Garante que smtp_from seja igual a smtp_user.
    """
    placeholder_password = "••••••••"

    current_user.smtp_host = config_data.smtp_host
    current_user.smtp_port = config_data.smtp_port
    current_user.smtp_user = config_data.smtp_user
    current_user.smtp_from = config_data.smtp_user  # Sincroniza automaticamente o From com o Login SMTP

    if config_data.smtp_password and config_data.smtp_password != placeholder_password:
        current_user.smtp_password = config_data.smtp_password

    db.commit()
    db.refresh(current_user)

    return {
        "smtp_host": current_user.smtp_host,
        "smtp_port": current_user.smtp_port,
        "smtp_user": current_user.smtp_user,
        "has_password": bool(current_user.smtp_password or settings.SMTP_PASSWORD)
    }
