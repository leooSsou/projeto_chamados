#!/bin/bash

# Inicia o container do backend em segundo plano (detached mode)
echo "🚀 Iniciando backend em segundo plano..."
docker compose up -d backend

# Inicia o servidor do frontend em primeiro plano no mesmo terminal
echo "⚡ Iniciando servidor do frontend..."
cd frontend
npm run dev
