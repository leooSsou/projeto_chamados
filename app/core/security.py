import bcrypt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Valida se a senha plana coincide com o hash gravado no banco usando a biblioteca bcrypt diretamente."""
    if not isinstance(plain_password, str) or not isinstance(hashed_password, str):
        return False
    try:
        # Converte para bytes antes de validar
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
    
    # Retorna o hash decodificado como string para salvar no banco
    return hashed_bytes.decode("utf-8")
