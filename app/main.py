import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.api.auth import router as auth_router
from app.api.usuarios import router as usuarios_router
from app.api.chamados import router as chamados_router

# Garante que a pasta de uploads estáticos existe localmente
os.makedirs("/app/static/uploads", exist_ok=True)

app = FastAPI(
    title="Sistema de Chamados TI",
    description="API do Módulo de Chamados Operacionais Hoteleiros (TI)",
    version="1.0.0"
)

app.mount("/static", StaticFiles(directory="/app/static"), name="static")

app.include_router(auth_router, prefix="/auth")
app.include_router(usuarios_router)
app.include_router(chamados_router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Sistema de Chamados TI - API Hoteleira Operando"
    }
