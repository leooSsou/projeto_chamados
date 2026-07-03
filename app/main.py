from fastapi import FastAPI
from app.api.auth import router as auth_router

app = FastAPI(
    title="Sistema de Chamados TI",
    description="API do Módulo de Chamados Operacionais Hoteleiros (TI)",
    version="1.0.0"
)

app.include_router(auth_router, prefix="/auth")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Sistema de Chamados TI - API Hoteleira Operando"
    }
