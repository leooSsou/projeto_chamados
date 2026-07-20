from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Dict, List, Any
from pydantic import BaseModel

from app.core.database import get_db
from app.api.dependencies import get_current_user, RoleChecker
from app.models import User, UserProfile, SystemOption

router = APIRouter(prefix="/opcoes", tags=["Opções do Sistema"])

# Apenas Supervisores podem criar e remover opções dinâmicas do sistema
require_supervisor = RoleChecker([UserProfile.SUPERVISOR])

DEFAULT_SUBCATEGORIES = ["Wi-Fi", "Fechadura Eletrônica", "TV / VoIP", "Catraca", "Computador", "Outros"]
DEFAULT_COMMON_AREAS = ["Recepção", "Restaurante", "Corredor", "Estacionamento", "Piscina", "Academia", "Eventos", "Outros"]
DEFAULT_LOCATION_TYPES = ["Área Comum", "Quarto", "Administrativo"]

class OptionCreateSchema(BaseModel):
    category: str  # location_type, common_area, subcategory
    name: str

class OptionResponseSchema(BaseModel):
    id: int
    category: str
    name: str

    class Config:
        from_attributes = True

@router.get("", response_model=Dict[str, List[OptionResponseSchema]])
def get_system_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna a lista completa de opções ativas de Formulário (Tipos de Local, Locais e Subcategorias).
    Se o banco ainda estiver vazio, inicializa com os dados padrão automaticamente.
    """
    existing = db.query(SystemOption).all()

    # Se a tabela estiver vazia, popula os itens padrão
    if not existing:
        seed_items = []
        for name in DEFAULT_LOCATION_TYPES:
            seed_items.append(SystemOption(category="location_type", name=name))
        for name in DEFAULT_COMMON_AREAS:
            seed_items.append(SystemOption(category="common_area", name=name))
        for name in DEFAULT_SUBCATEGORIES:
            seed_items.append(SystemOption(category="subcategory", name=name))
        
        db.add_all(seed_items)
        db.commit()
        existing = db.query(SystemOption).all()

    location_types = [item for item in existing if item.category == "location_type"]
    common_areas = [item for item in existing if item.category == "common_area"]
    subcategories = [item for item in existing if item.category == "subcategory"]

    return {
        "location_types": location_types,
        "common_areas": common_areas,
        "subcategories": subcategories
    }

@router.post("", response_model=OptionResponseSchema, status_code=status.HTTP_201_CREATED)
def create_system_option(
    payload: OptionCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor)
):
    """Permite ao Supervisor cadastrar um novo tipo de local, local hoteleiro ou subcategoria de TI."""
    category = payload.category.strip().lower()
    name = payload.name.strip()

    if category not in ["location_type", "common_area", "subcategory"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Categoria inválida. Use 'location_type', 'common_area' ou 'subcategory'."
        )

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O nome da opção não pode ser vazio."
        )

    # Verifica duplicatas
    duplicate = db.query(SystemOption).filter(
        SystemOption.category == category,
        SystemOption.name == name
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A opção '{name}' já existe nesta categoria."
        )

    new_option = SystemOption(category=category, name=name)
    db.add(new_option)
    db.commit()
    db.refresh(new_option)
    return new_option

@router.delete("/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_system_option(
    option_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor)
):
    """Permite ao Supervisor remover um tipo de local, local ou subcategoria do sistema."""
    option = db.get(SystemOption, option_id)
    if not option:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opção não encontrada."
        )

    db.delete(option)
    db.commit()
    return None
