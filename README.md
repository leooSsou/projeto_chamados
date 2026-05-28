# Sistema de Chamados Web

Nova versão web do projeto de chamados, usando FastAPI, SQLAlchemy e banco relacional SQLite.

## Rodar localmente

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Acesse `http://127.0.0.1:8000`.

Usuários iniciais:

- `suporte` / `suporte123`
- `usuario` / `usuario123`

O banco local é criado automaticamente em `chamados.db`.
