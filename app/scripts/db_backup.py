import os
import sys
import sqlite3
import logging
from datetime import datetime, timedelta

# Adiciona o diretório raiz do projeto ao sys.path para os imports funcionarem
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("db_backup")

# Diretório padrão para salvar os arquivos de backup
BACKUPS_DIR = "/app/backups"

def run_backup():
    """
    Executa o backup online do banco de dados SQLite de forma segura sem travar escritas concorrentes,
    e rotaciona os backups antigos removendo arquivos com mais de 7 dias de vida.
    """
    if not settings.DATABASE_URL.startswith("sqlite"):
        logger.warning("DATABASE_URL não utiliza SQLite. Ignorando backup automatizado de arquivo local.")
        return
        
    # Extrai o caminho físico do banco (ex: ./chamados.db)
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    
    # Resolve caminhos relativos ao diretório raiz se necessário
    if not os.path.isabs(db_path):
        db_path = os.path.abspath(db_path)
        
    if not os.path.exists(db_path):
        logger.error(f"Banco de dados de origem não encontrado em: {db_path}")
        return
        
    # Garante que o diretório de backups existe
    os.makedirs(BACKUPS_DIR, exist_ok=True)
    
    # Nome do arquivo com timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"backup_{timestamp}.db"
    backup_path = os.path.join(BACKUPS_DIR, backup_filename)
    
    try:
        logger.info("Iniciando cópia física do banco de dados (SQLite Online Backup)...")
        # Abre conexão de origem e destino
        src = sqlite3.connect(db_path)
        dst = sqlite3.connect(backup_path)
        
        # Realiza backup atômico
        with dst:
            src.backup(dst)
            
        src.close()
        dst.close()
        logger.info(f"Backup concluído com sucesso e salvo em: {backup_path}")
        
        # Rotatividade: Limpa backups com mais de 7 dias
        purge_backups()
    except Exception as err:
        logger.error(f"Erro crítico durante a execução do backup do banco: {str(err)}")

def purge_backups():
    """Remove arquivos de backup mais antigos que 7 dias."""
    now = datetime.now()
    retention_limit = timedelta(days=7)
    
    try:
        for filename in os.listdir(BACKUPS_DIR):
            file_path = os.path.join(BACKUPS_DIR, filename)
            if os.path.isfile(file_path) and filename.startswith("backup_") and filename.endswith(".db"):
                # Verifica data de modificação
                file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                if now - file_mtime > retention_limit:
                    os.remove(file_path)
                    logger.info(f"Backup antigo expirado e removido: {filename}")
    except Exception as e:
        logger.error(f"Erro ao limpar backups expirados: {str(e)}")

if __name__ == "__main__":
    run_backup()
