import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from sqlalchemy import select
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.chamado import Ticket, NotificationLog
from app.models.usuario import User

logger = logging.getLogger("email_service")

def send_email_in_background(ticket_id: int, sender_user_id: int, recipient_email: str, subject: str, body_html: str):
    """
    Função assíncrona executada em background para envio real de e-mails via SMTP
    e gravação do log de envio na tabela 'logs_notificacao'.
    Lê configurações SMTP dinâmicas do banco ou adota fallbacks de variáveis de ambiente.
    """
    db = SessionLocal()
    try:
        # Busca o usuário remetente no banco para ler suas credenciais SMTP
        sender_user = db.get(User, sender_user_id) if sender_user_id else None

        smtp_host = sender_user.smtp_host if (sender_user and sender_user.smtp_host) else settings.SMTP_HOST
        smtp_port = sender_user.smtp_port if (sender_user and sender_user.smtp_port) else settings.SMTP_PORT
        smtp_user = sender_user.smtp_user if (sender_user and sender_user.smtp_user) else settings.SMTP_USER
        smtp_password = sender_user.smtp_password if (sender_user and sender_user.smtp_password) else settings.SMTP_PASSWORD
        smtp_from = sender_user.smtp_from if (sender_user and sender_user.smtp_from) else (sender_user.smtp_user if (sender_user and sender_user.smtp_user) else settings.SMTP_FROM)

        # Se o destinatário for o e-mail padrão da TI, envia para todos os técnicos e supervisores do sistema
        recipients = []
        if recipient_email == "ti@hotel.com.br":
            from app.models.usuario import UserProfile
            stmt = select(User).where(User.profile.in_([UserProfile.TECNICO, UserProfile.SUPERVISOR]))
            staff_users = db.execute(stmt).scalars().all()
            recipients = [u.username for u in staff_users if u.username]
            if not recipients:
                recipients = ["ti@hotel.com.br"]
        else:
            recipients = [recipient_email]

        for target in recipients:
            status = "failed"
            # Se host estiver configurado e não for o valor dummy de dev
            if smtp_host and smtp_password != "dummy_key":
                try:
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = subject
                    msg["From"] = smtp_from
                    msg["To"] = target
                    msg.attach(MIMEText(body_html, "html"))
                    
                    # Conexão SMTP com suporte a SSL (Porta 465) ou STARTTLS (Porta 587/Outras)
                    if smtp_port == 465:
                        server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
                    else:
                        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
                        server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_from, target, msg.as_string())
                    server.quit()
                    
                    status = "success"
                    logger.info(f"E-mail enviado com sucesso para: {target}")
                except Exception as smtp_err:
                    logger.error(f"Falha de SMTP ao enviar e-mail para {target}: {str(smtp_err)}")
            else:
                # Mock para testes locais e desenvolvimento sem travar a aplicação
                logger.info(f"[MOCK SMTP] Simulando envio de e-mail para {target} - Assunto: {subject}")
                status = "success"
                
            # Grava log na tabela logs_notificacao
            log = NotificationLog(
                ticket_id=ticket_id,
                recipient_email=target,
                subject=subject,
                status=status
            )
            db.add(log)
        
        db.commit()
    except Exception as db_err:
        logger.error(f"Erro ao salvar log de notificação no banco: {str(db_err)}")
        db.rollback()
    finally:
        db.close()

def notify_ticket_created(ticket: Ticket) -> tuple:
    """Retorna os parâmetros para envio de e-mail de criação (Notificar a equipe de TI)."""
    subject = f"[Nova OS TI] {ticket.code} - {ticket.subcategory}"
    body_html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #1A365D;">Nova Ordem de Serviço Aberta (TI)</h2>
            <hr/>
            <p><strong>Código da OS:</strong> {ticket.code}</p>
            <p><strong>Localização:</strong> {ticket.location_type.value} ({ticket.location_details})</p>
            <p><strong>Subcategoria:</strong> {ticket.subcategory}</p>
            <p><strong>Prioridade:</strong> {ticket.priority} (Prazo SLA: {ticket.sla_duration_hours}h)</p>
            <p><strong>Descrição:</strong> {ticket.description}</p>
            <br/>
            <p style="font-size: 11px; color: #777;">Este é um e-mail automático gerado pelo Sistema de Chamados do Hotel.</p>
        </body>
    </html>
    """
    # Mandamos para a fila padrão de TI
    return ticket.id, "ti@hotel.com.br", subject, body_html

def notify_ticket_resolved(ticket: Ticket, recipient_email: str) -> tuple:
    """Retorna os parâmetros para envio de e-mail de resolução (Notificar o solicitante/cliente)."""
    subject = f"[OS TI Resolvida] {ticket.code} - Aguardando Homologação"
    body_html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #2B6CB0;">Sua Ordem de Serviço foi Resolvida!</h2>
            <hr/>
            <p><strong>Código da OS:</strong> {ticket.code}</p>
            <p><strong>Localização:</strong> {ticket.location_type.value} ({ticket.location_details})</p>
            <p><strong>Técnico Responsável:</strong> {ticket.tecnico_designado.name if ticket.tecnico_designado else 'N/A'}</p>
            <p><strong>Resolução Técnica:</strong> {ticket.resolution_summary}</p>
            <br/>
            <p>Por favor, acesse o sistema para realizar a <strong>homologação (encerramento)</strong> ou a <strong>reabertura</strong> caso a falha persista.</p>
            <br/>
            <p style="font-size: 11px; color: #777;">Este é um e-mail automático gerado pelo Sistema de Chamados do Hotel.</p>
        </body>
    </html>
    """
    return ticket.id, recipient_email, subject, body_html
