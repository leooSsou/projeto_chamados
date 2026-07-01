from datetime import timedelta
from jose import jwt
from app.core.config import settings
from app.core.security import create_access_token, decode_access_token

def test_gerar_e_decodificar_token_valido() -> None:
    """Valida que um token gerado pode ser decodificado retornando os claims originais."""
    dados = {"sub": "lucas@hotel.com.br", "profile": "Cliente"}
    token = create_access_token(data=dados)
    
    # O token gerado deve ser uma string e não deve ser vazio
    assert isinstance(token, str)
    assert len(token) > 0
    
    # Decodifica e valida o conteúdo recuperado
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "lucas@hotel.com.br"
    assert payload["profile"] == "Cliente"
    assert "exp" in payload  # Deve possuir data de expiração inclusa

def test_token_expirado_retorna_none() -> None:
    """Valida que um token expirado falha ao ser decodificado, retornando None."""
    dados = {"sub": "lucas@hotel.com.br"}
    # Cria token expirado definindo delta negativo (-1 minuto)
    token_expirado = create_access_token(data=dados, expires_delta=timedelta(minutes=-1))
    
    payload = decode_access_token(token_expirado)
    assert payload is None

def test_token_invalido_ou_malformado_retorna_none() -> None:
    """Garante que assinaturas inválidas ou tokens malformados retornam None ao decodificar."""
    # Token totalmente malformado
    assert decode_access_token("token_invalido_qualquer") is None
    
    # Token assinado com outra chave secreta não cadastrada no Docker
    dados = {"sub": "lucas@hotel.com.br"}
    token_outra_chave = jwt.encode(dados, "outra_chave_secreta_errada", algorithm=settings.ALGORITHM)
    assert decode_access_token(token_outra_chave) is None
