from typing import Tuple

# Lista de subcategorias críticas de TI para quartos ocupados
CRITICAL_SUBCATEGORIES = {"Wi-Fi", "Fechadura Eletrônica", "TV / VoIP"}

def calculate_sla_and_priority(
    location_type: any,
    is_room_occupied: bool,
    subcategory: any
) -> Tuple[str, float]:
    """
    Calcula a prioridade e a duração do SLA em horas para o chamado de TI.
    
    SLA de 2 horas (Prioridade Alta):
    - Localização é "Quarto"
    - Quarto está ocupado (is_room_occupied=True)
    - Subcategoria pertence às críticas de TI (Wi-Fi, Fechadura Eletrônica, TV / VoIP)
    
    SLA de 24 horas (Prioridade Média):
    - Qualquer outro caso (Áreas comuns, quartos vagos ou demais subcategorias).
    """
    # Trata enums e strings de forma robusta obtendo a propriedade .value se disponível
    loc_val = location_type.value if hasattr(location_type, "value") else str(location_type)
    is_room = loc_val.strip().lower() == "quarto"
    is_occupied = bool(is_room_occupied)
    
    sub_val = subcategory.value if hasattr(subcategory, "value") else str(subcategory)
    sub_clean = sub_val.strip()
    is_critical = sub_clean in CRITICAL_SUBCATEGORIES
    
    if is_room and is_occupied and is_critical:
        return "Alta", 2.0
        
    return "Média", 24.0
