from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.usuario import User, UserProfile

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """
    Dependência injetável que extrai o token JWT do cabeçalho de autorização,
    valida sua autenticidade e retorna o usuário logado do banco de dados.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais de autenticação inválidas ou expiradas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Decodifica o token JWT
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
        
    # Extrai o username (sub) do payload do token
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
        
    # Busca o usuário no banco de dados
    stmt = select(User).where(User.username == username)
    result = db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
        
    return user

class RoleChecker:
    """
    Dependência injetável para restringir acessos a rotas com base no perfil do usuário (RBAC).
    Exemplo de uso: Depends(RoleChecker([UserProfile.SUPERVISOR, UserProfile.TECNICO]))
    """
    def __init__(self, allowed_profiles: List[UserProfile]):
        self.allowed_profiles = allowed_profiles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.profile not in self.allowed_profiles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso não autorizado para o seu perfil de usuário"
            )
        return current_user
