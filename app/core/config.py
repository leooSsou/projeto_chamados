import os

class Settings:
    # Chave secreta padrão usada exclusivamente para desenvolvimento local
    DEFAULT_SECRET_KEY: str = "949f57ebbf795be246416629bc113b27b3b64cd93c9d646a2a0a2df37b42ff2e"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", DEFAULT_SECRET_KEY)
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480")) # 8 horas
    
    # Banco de dados
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./chamados.db")
    
    # Configurações de E-mail
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "chamados@hotel.com.br")
    
    # Ambiente
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    def __init__(self) -> None:
        # Trava de Segurança Crítica para o ambiente de Produção
        if self.ENVIRONMENT.strip().lower() == "production":
            if self.SECRET_KEY == self.DEFAULT_SECRET_KEY or not self.SECRET_KEY:
                raise ValueError(
                    "ERRO CRÍTICO DE SEGURANÇA: A SECRET_KEY não pode usar o valor padrão de desenvolvimento em Produção! "
                    "Configure uma chave segura e única nas variáveis de ambiente do servidor."
                )

settings = Settings()
