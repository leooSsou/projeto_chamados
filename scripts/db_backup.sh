#!/bin/bash
# Script utilitário de backup para agendamento (cron) no host.
# Navega até o diretório raiz do projeto e executa o backup dentro do container.

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

docker compose run --rm backend python3 app/scripts/db_backup.py
