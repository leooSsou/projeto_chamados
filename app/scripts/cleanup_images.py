import os
import sys
import logging
from datetime import datetime, timedelta
from sqlalchemy import select

# Adiciona o diretório raiz do projeto ao sys.path para os imports funcionarem
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.models.chamado import Ticket, TicketStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cleanup_images")

# Diretório padrão onde as mídias são salvas localmente no container
UPLOADS_DIR = "/app/static/uploads"

def run_image_cleanup():
    """
    Localiza chamados no status 'Fechado' há mais de 90 dias com links de imagem ativos,
    remove fisicamente os arquivos do disco do servidor e limpa a referência image_url no banco.
    """
    db = SessionLocal()
    try:
        limit_date = datetime.now() - timedelta(days=90)
        stmt = (
            select(Ticket)
            .where(
                Ticket.status == TicketStatus.FECHADO,
                Ticket.image_url.isnot(None),
                Ticket.closed_at < limit_date
            )
        )
        result = db.execute(stmt)
        tickets = result.scalars().all()
        
        logger.info(f"Buscando imagens antigas... Encontrados {len(tickets)} chamados elegíveis para limpeza.")
        
        cleaned_count = 0
        for ticket in tickets:
            url_path = ticket.image_url
            if not url_path:
                continue
                
            # Extrai o nome base do arquivo físico
            filename = os.path.basename(url_path)
            local_path = os.path.join(UPLOADS_DIR, filename)
            
            # Deleta o arquivo do disco se ele existir localmente
            if os.path.exists(local_path):
                try:
                    os.remove(local_path)
                    logger.info(f"Imagem deletada fisicamente: {local_path}")
                except Exception as file_err:
                    logger.error(f"Erro ao remover arquivo físico {local_path}: {str(file_err)}")
            
            # Limpa o link do banco de dados para indicar que a mídia expirou/foi retida
            ticket.image_url = None
            cleaned_count += 1
            
        db.commit()
        logger.info(f"Limpeza de imagens concluída. {cleaned_count} chamados atualizados.")
    except Exception as e:
        logger.error(f"Erro ao executar rotina de retenção de imagens: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_image_cleanup()
