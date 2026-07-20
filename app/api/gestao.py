from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from datetime import datetime, timedelta
from typing import Dict, Any, List

from app.core.database import get_db
from app.api.dependencies import get_current_user, RoleChecker
from app.models.usuario import User, UserProfile
from app.models.chamado import Ticket, TicketStatus

router = APIRouter(prefix="/gestao", tags=["Gestão & KPIs"])

# Apenas usuários com perfil Supervisor podem acessar os endpoints analíticos de gestão
require_gestor = RoleChecker([UserProfile.SUPERVISOR])

@router.get("/kpis")
def get_kpi_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_gestor)
) -> Dict[str, Any]:
    """
    Retorna métricas executivas e dados analíticos de desempenho da operação de TI para Gestores e Supervisores.
    Métricas inclusas: Compliance de SLA, MTTR (Tempo Médio de Resolução), Distribuição por Subcategoria e Produtividade por Técnico.
    """
    tickets = db.query(Ticket).all()
    total_chamados = len(tickets)

    if total_chamados == 0:
        return {
            "total_chamados": 0,
            "chamados_por_status": {},
            "cumprimento_sla_percent": 100.0,
            "mttr_medio_horas": 0.0,
            "chamados_criticos_ocupados": 0,
            "taxa_reabertura_percent": 0.0,
            "desempenho_tecnicos": [],
            "distribuicao_subcategorias": {}
        }

    # 1. Distribuição por Status
    status_counts = {}
    for st in TicketStatus:
        status_counts[st.value] = sum(1 for t in tickets if t.status == st)

    # 2. Cumprimento de SLA
    now = datetime.now()
    total_sla_calculable = [t for t in tickets if t.sla_deadline]
    expired_count = sum(
        1 for t in total_sla_calculable 
        if t.sla_deadline < now and t.status not in [TicketStatus.RESOLVIDO, TicketStatus.FECHADO]
    )
    cumprimento_sla = (
        ((len(total_sla_calculable) - expired_count) / len(total_sla_calculable)) * 100.0
        if total_sla_calculable else 100.0
    )

    # 3. MTTR (Mean Time to Resolution)
    # Calculado para chamados resolvidos/fechados: (resolved_at - started_at - sla_paused_seconds)
    resolved_tickets = [t for t in tickets if t.resolved_at and t.started_at]
    mttr_durations = []
    for t in resolved_tickets:
        delta = (t.resolved_at - t.started_at).total_seconds() - (t.sla_paused_seconds or 0)
        mttr_durations.append(max(0, delta))
    
    avg_mttr_hours = (sum(mttr_durations) / len(mttr_durations) / 3600.0) if mttr_durations else 0.0

    # 4. Chamados em Quartos Ocupados com Hóspede
    criticos_ocupados = sum(1 for t in tickets if t.is_room_occupied)

    # 5. Taxa de Reabertura
    reabertos_count = sum(1 for t in tickets if t.reopen_count > 0)
    taxa_reabertura = (reabertos_count / total_chamados) * 100.0

    # 6. Distribuição por Subcategoria
    distribuicao_subcat = {}
    for t in tickets:
        distribuicao_subcat[t.subcategory] = distribuicao_subcat.get(t.subcategory, 0) + 1

    # 7. Desempenho da Equipe Técnica
    tecnicos = db.query(User).filter(User.profile.in_([UserProfile.TECNICO, UserProfile.SUPERVISOR])).all()
    desempenho_tecnicos = []

    for tec in tecnicos:
        tec_tickets = [t for t in tickets if t.assigned_technician_id == tec.id]
        tec_resolved = [t for t in tec_tickets if t.status in [TicketStatus.RESOLVIDO, TicketStatus.FECHADO]]
        
        # MTTR individual
        tec_mttrs = []
        for t in tec_resolved:
            if t.started_at and t.resolved_at:
                delta = (t.resolved_at - t.started_at).total_seconds() - (t.sla_paused_seconds or 0)
                tec_mttrs.append(max(0, delta))
        tec_avg_mttr = (sum(tec_mttrs) / len(tec_mttrs) / 3600.0) if tec_mttrs else 0.0

        desempenho_tecnicos.append({
            "id": tec.id,
            "nome": tec.name,
            "username": tec.username,
            "perfil": tec.profile.value,
            "total_atribuidos": len(tec_tickets),
            "concluidos": len(tec_resolved),
            "mttr_medio_horas": round(tec_avg_mttr, 1)
        })

    return {
        "total_chamados": total_chamados,
        "chamados_por_status": status_counts,
        "cumprimento_sla_percent": round(cumprimento_sla, 1),
        "mttr_medio_horas": round(avg_mttr_hours, 1),
        "chamados_criticos_ocupados": criticos_ocupados,
        "taxa_reabertura_percent": round(taxa_reabertura, 1),
        "distribuicao_subcategorias": distribuicao_subcat,
        "desempenho_tecnicos": desempenho_tecnicos
    }
