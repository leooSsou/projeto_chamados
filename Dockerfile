FROM python:3.11-slim

# Evita que o Python escreva arquivos .pyc em disco e bufe a saída do console
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instala dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Instala as dependências Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código do projeto
COPY . /app/

EXPOSE 8000

# Comando para iniciar com auto-reload para desenvolvimento
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
