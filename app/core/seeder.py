from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.usuario import User, UserProfile
from app.core.security import get_password_hash

def seed_database(db: Session) -> None:
    """Popula o banco de dados de forma idempotente com usuários de TI, Recepção e Gerência."""
    
    # 1. Cadastra Supervisor de TI
    stmt = select(User).where(User.username == "supervisor.ti@hotel.com.br")
    if not db.execute(stmt).scalar_one_or_none():
        supervisor_ti = User(
            name="Supervisor de TI",
            username="supervisor.ti@hotel.com.br",
            password_hash=get_password_hash("SupervisorTI123"),
            department="TI",
            profile=UserProfile.SUPERVISOR,
            must_change_password=True
        )
        db.add(supervisor_ti)

    # 2. Cadastra Técnico de TI
    stmt = select(User).where(User.username == "tecnico.ti@hotel.com.br")
    if not db.execute(stmt).scalar_one_or_none():
        tecnico_ti = User(
            name="Técnico de TI",
            username="tecnico.ti@hotel.com.br",
            password_hash=get_password_hash("TecnicoTI123"),
            department="TI",
            profile=UserProfile.TECNICO,
            must_change_password=True
        )
        db.add(tecnico_ti)

    # 3. Cadastra Cliente (Recepção)
    stmt = select(User).where(User.username == "cliente.recepcao@hotel.com.br")
    if not db.execute(stmt).scalar_one_or_none():
        cliente_recepcao = User(
            name="Colaborador Recepção",
            username="cliente.recepcao@hotel.com.br",
            password_hash=get_password_hash("Recepcao123"),
            department="Recepção",
            profile=UserProfile.CLIENTE,
            must_change_password=True
        )
        db.add(cliente_recepcao)

    # 4. Cadastra Gerente Geral
    stmt = select(User).where(User.username == "gerente@hotel.com.br")
    if not db.execute(stmt).scalar_one_or_none():
        gerente = User(
            name="Gerente Geral",
            username="gerente@hotel.com.br",
            password_hash=get_password_hash("Gerente123"),
            department="Gerência",
            profile=UserProfile.GERENTE,
            must_change_password=True
        )
        db.add(gerente)

    db.commit()

if __name__ == "__main__":
    from app.core.database import SessionLocal
    print("Iniciando carga de dados (Data Seeding)...")
    db = SessionLocal()
    try:
        seed_database(db)
        print("Carga de dados finalizada com sucesso!")
    except Exception as e:
        print(f"Erro ao executar o Data Seeding: {e}")
    finally:
        db.close()
