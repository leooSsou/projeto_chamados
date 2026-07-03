import pytest
from app.core.security import get_password_hash, verify_password

def test_criptografia_e_verificacao_basica() -> None:
    """Valida o fluxo básico de geração de hash e verificação de sucesso/erro."""
    senha = "MinhaSenhaSuperSegura123"
    hash_senha = get_password_hash(senha)
    
    # Não deve expor a senha original
    assert hash_senha != senha
    # Deve começar com o cabeçalho do Bcrypt ($2b$)
    assert hash_senha.startswith("$2b$")
    # Verificação com a senha correta deve ser verdadeira
    assert verify_password(senha, hash_senha) is True
    # Verificação com senha incorreta deve ser falsa
    assert verify_password("outrasenha", hash_senha) is False

def test_hashes_diferentes_para_mesma_senha() -> None:
    """Garante que a criptografia usa 'salts' aleatórios, gerando hashes diferentes."""
    senha = "SenhaIdentica123"
    hash1 = get_password_hash(senha)
    hash2 = get_password_hash(senha)
    
    # Os hashes físicos devem ser diferentes
    assert hash1 != hash2
    # Ambos devem ser válidos para a mesma senha
    assert verify_password(senha, hash1) is True
    assert verify_password(senha, hash2) is True

def test_comprimento_do_hash_bcrypt() -> None:
    """Garante que o hash gerado pelo Bcrypt tem exatamente 60 caracteres."""
    hash_senha = get_password_hash("qualquer_senha")
    assert len(hash_senha) == 60

def test_senha_vazia() -> None:
    """Valida o comportamento com strings de senhas vazias."""
    hash_vazio = get_password_hash("")
    assert len(hash_vazio) == 60
    assert verify_password("", hash_vazio) is True
    assert verify_password(" ", hash_vazio) is False  # Espaço em branco é diferente de vazio

def test_tipo_invalido_deve_levantar_type_error() -> None:
    """Garante que a criptografia exige estritamente strings, levantando TypeError para outros tipos."""
    with pytest.raises(TypeError):
        get_password_hash(None)  # type: ignore
        
    with pytest.raises(TypeError):
        get_password_hash(12345)  # type: ignore
