from datetime import datetime
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.models.usuario import User

def test_criar_usuario_no_banco(db_session) -> None:
    """
    Testa se a entidade User consegue ser criada e salva corretamente no banco de dados,
    validando todos os campos e regras padrão.
    """
    # 1. Preparação (Criar dados fictícios)
    novo_usuario = User(
        name="Leonard Souza",
        username="leonardossilva2003@gmail.com",
        password_hash="senha_criptografada_bcrypt",
        department="Recepção",
        profile="Cliente"
    )
    
    # 2. Execução (Salvar no banco)
    db_session.add(novo_usuario)
    db_session.commit()
    
    # 3. Busca (Recuperar o usuário do banco)
    stmt = select(User).where(User.username == "leonardossilva2003@gmail.com")
    usuario_db = db_session.execute(stmt).scalar_one()
    
    # 4. Asserções (Validação das regras de negócio)
    assert usuario_db.id is not None
    assert usuario_db.name == "Leonard Souza"
    assert usuario_db.username == "leonardossilva2003@gmail.com"
    assert usuario_db.password_hash == "senha_criptografada_bcrypt"
    assert usuario_db.department == "Recepção"
    assert usuario_db.profile == "Cliente"
    
    # Regra Crítica: Senhas criadas pelo supervisor exigem alteração no primeiro login
    assert usuario_db.must_change_password is True
    
    # Regra: created_at deve ser preenchido automaticamente com a data/hora atual
    assert isinstance(usuario_db.created_at, datetime)

def test_evitar_username_duplicado(db_session) -> None:
    """Garante que o banco de dados não permite dois usuários com o mesmo username."""
    # 1. Cria e salva o primeiro usuário
    user1 = User(
        name="Usuário Um",
        username="duplicado@hotel.com.br",
        password_hash="hash1",
        department="Recepção",
        profile="Cliente"
    )
    db_session.add(user1)
    db_session.commit()

    # 2. Tenta criar o segundo com o mesmo username
    user2 = User(
        name="Usuário Dois",
        username="duplicado@hotel.com.br",  # Mesmo username!
        password_hash="hash2",
        department="Governança",
        profile="Cliente"
    )
    db_session.add(user2)
    
    # 3. Asserção: O commit deve falhar e levantar um IntegrityError do SQLAlchemy
    with pytest.raises(IntegrityError):
        db_session.commit()

def test_campos_obrigatorios_nao_nulos(db_session) -> None:
    """Garante que o banco recusa a criação de usuários com campos obrigatórios nulos."""
    usuario_invalido = User(
        name=None,  # Campo obrigatório nulo!
        username="invalido@hotel.com.br",
        password_hash="hash",
        department="TI",
        profile="Técnico"
    )
    db_session.add(usuario_invalido)
    
    # Asserção: Deve falhar ao salvar no banco
    with pytest.raises(IntegrityError):
        db_session.commit()
