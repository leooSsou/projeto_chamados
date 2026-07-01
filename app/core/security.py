from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from jose import jwt, JWTError
from app.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Valida se a senha plana coincide com o hash gravado no banco usando a biblioteca bcrypt diretamente."""
    if not isinstance(plain_password, str) or not isinstance(hashed_password, str):
        return False
    try:
        plain_bytes = plain_password.encode("utf-8")
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Gera o hash Bcrypt a partir de uma senha em texto limpo usando a biblioteca bcrypt diretamente."""
    if not isinstance(password, str):
        raise TypeError("A senha deve ser estritamente do tipo string")
    
    # Converte a senha para bytes
    password_bytes = password.encode("utf-8")
    
    # Gera o salt aleatório e computa o hash
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    
    # Retorna o hash decodificado como string
    return hashed_bytes.decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Gera um Token JWT assinado contendo os dados fornecidos e tempo de expiração."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Adiciona o timestamp de expiração (UTC)
    to_encode.update({"exp": expire})
    
    # Codifica e assina o token usando a chave secreta
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decodifica um Token JWT, retornando os dados originais ou None se for inválido/expirado."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
