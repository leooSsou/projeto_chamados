from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.database import get_db
from app.models.usuario import User
from app.core.security import verify_password, create_access_token
from app.schemas.auth import UserLogin, Token

router = APIRouter(tags=["Autenticação"])

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """
    Realiza a autenticação do usuário.
    Garante busca case-insensitive e parametrização contra SQL Injection.
    """
    # Converte username para caixa baixa para garantir case-insensitive
    username_lower = login_data.username.strip().lower()
    
    # Busca usuário no banco de dados com query parametrizada
    stmt = select(User).where(User.username == username_lower)
    result = db.execute(stmt)
    user = result.scalar_one_or_none()
    
    # Se usuário não existe ou a senha está incorreta
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos"
        )
    
    # Gera token de acesso JWT contendo username e perfil
    access_token = create_access_token(
        data={"sub": user.username, "profile": user.profile.value}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }
