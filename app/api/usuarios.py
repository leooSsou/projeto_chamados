from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.database import get_db
from app.models.usuario import User, UserProfile
from app.core.security import get_password_hash
from app.api.dependencies import RoleChecker
from app.schemas.usuario import UserCreate, UserResponse

router = APIRouter(tags=["Usuários"])

@router.post("/usuarios", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(RoleChecker([UserProfile.SUPERVISOR]))])
def criar_usuario(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Cadastra um novo colaborador no sistema.
    Disponível exclusivamente para o Supervisor.
    """
    username_lower = user_data.username.strip().lower()
    
    # 1. Verifica se já existe um usuário com o mesmo login (case-insensitive)
    stmt = select(User).where(User.username == username_lower)
    result = db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username já cadastrado"
        )
    
    # 2. Cria o colaborador com a senha provisória e força troca de senha
    novo_usuario = User(
        name=user_data.name,
        username=username_lower,
        password_hash=get_password_hash(user_data.password),
        department=user_data.department,
        profile=user_data.profile,
        must_change_password=True  # Obriga alteração no primeiro login
    )
    
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    
    return novo_usuario


@router.get("/usuarios", response_model=list[UserResponse])
def listar_usuarios(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserProfile.SUPERVISOR]))
):
    """
    Lista todos os colaboradores cadastrados.
    Disponível exclusivamente para o Supervisor.
    """
    stmt = select(User).order_by(User.name.asc())
    result = db.execute(stmt)
    return result.scalars().all()
