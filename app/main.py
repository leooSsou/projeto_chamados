from fastapi import FastAPI

app = FastAPI(
    title="Sistema de Chamados TI",
    description="API do Módulo de Chamados Operacionais Hoteleiros (TI)",
    version="1.0.0"
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Sistema de Chamados TI - API Hoteleira Operando"
    }
