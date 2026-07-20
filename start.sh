#!/bin/bash

# Garante que o Node.js/npm no ~/.local/bin esteja no PATH
export PATH=$HOME/.local/bin:$PATH

echo "=================================================="
echo "🚀 Iniciando o Sistema de Chamados (TI & Hoteleiro)"
echo "=================================================="

# 1. Inicia o container do backend em segundo plano (detached mode)
echo "📦 Iniciando backend no Docker..."
docker compose up -d backend

# 2. Executa migrações do banco de dados no container
echo "🗄️ Aplicando migrações do banco de dados (Alembic)..."
docker exec chamados_backend alembic upgrade head

# 3. Executa carga inicial de usuários (Data Seeding)
echo "👤 Populando usuários padrão no banco de dados..."
docker exec -e PYTHONPATH=/app chamados_backend python -m app.core.seeder

# 4. Exibe URLs de acesso do Backend
echo "✅ Backend rodando em: http://localhost:8000"
echo "📄 Documentação Swagger: http://localhost:8000/docs"
echo "--------------------------------------------------"

# 5. Inicia o servidor do frontend em primeiro plano no mesmo terminal
echo "⚡ Iniciando servidor do Frontend (Vite/React)..."
cd frontend
npm run dev
