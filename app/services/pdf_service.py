from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.chamado import Ticket

def generate_ticket_pdf(ticket: Ticket) -> BytesIO:
    """
    Gera um relatório PDF formatado e profissional da Ordem de Serviço (OS).
    Retorna o PDF como um buffer binário BytesIO.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Estilos customizados elegantes
    title_style = ParagraphStyle(
        name="TitleStyle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        textColor=colors.HexColor("#1A365D"),
        spaceAfter=12
    )
    
    label_style = ParagraphStyle(
        name="LabelStyle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=colors.HexColor("#2D3748")
    )
    
    value_style = ParagraphStyle(
        name="ValueStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#4A5568")
    )
    
    header_style = ParagraphStyle(
        name="HeaderStyle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        textColor=colors.HexColor("#1A365D"),
        spaceAfter=6
    )

    story = []
    
    # Cabeçalho corporativo do hotel
    story.append(Paragraph("ORDEM DE SERVIÇO - SISTEMA DE CHAMADOS HOTEL", title_style))
    story.append(Spacer(1, 10))
    
    # Datas formatadas com segurança
    created_at_str = ticket.created_at.strftime("%d/%m/%Y %H:%M") if ticket.created_at else "N/A"
    deadline_str = ticket.sla_deadline.strftime("%d/%m/%Y %H:%M") if ticket.sla_deadline else "N/A"
    started_at_str = ticket.started_at.strftime("%d/%m/%Y %H:%M") if ticket.started_at else "N/A"
    resolved_at_str = ticket.resolved_at.strftime("%d/%m/%Y %H:%M") if ticket.resolved_at else "N/A"
    
    # Grid de informações do Chamado
    data = [
        [Paragraph("Código da OS:", label_style), Paragraph(ticket.code, value_style),
         Paragraph("Status Atual:", label_style), Paragraph(ticket.status.value, value_style)],
        [Paragraph("Prioridade:", label_style), Paragraph(ticket.priority, value_style),
         Paragraph("Fila de Destino:", label_style), Paragraph(ticket.destination_queue, value_style)],
        [Paragraph("Localização:", label_style), Paragraph(f"{ticket.location_type.value} ({ticket.location_details})", value_style),
         Paragraph("Quarto Ocupado?", label_style), Paragraph("Sim" if ticket.is_room_occupied else "Não", value_style)],
        [Paragraph("Categoria:", label_style), Paragraph(ticket.category, value_style),
         Paragraph("Subcategoria:", label_style), Paragraph(ticket.subcategory, value_style)],
        [Paragraph("Aberto Em:", label_style), Paragraph(created_at_str, value_style),
         Paragraph("Prazo Limite SLA:", label_style), Paragraph(deadline_str, value_style)],
        [Paragraph("Início Atendimento:", label_style), Paragraph(started_at_str, value_style),
         Paragraph("Resolução Técnica:", label_style), Paragraph(resolved_at_str, value_style)],
    ]
    
    # Tabela com as informações gerais
    t = Table(data, colWidths=[120, 150, 120, 150])
    t.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#F8FAFC")),
        ('BACKGROUND', (2,0), (2,-1), colors.HexColor("#F8FAFC")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))
    
    # Seção de Descrição
    story.append(Paragraph("DESCRIÇÃO DA OCORRÊNCIA", header_style))
    story.append(Paragraph(ticket.description or "Sem descrição fornecida.", value_style))
    story.append(Spacer(1, 20))
    
    # Seção de Resolução
    if ticket.resolution_summary:
        story.append(Paragraph("SUMÁRIO DE RESOLUÇÃO TÉCNICA", header_style))
        story.append(Paragraph(ticket.resolution_summary, value_style))
        story.append(Spacer(1, 25))
        
    # Seção de Assinaturas para controle físico
    sig_data = [
        [Paragraph("_______________________________________", label_style),
         Paragraph("_______________________________________", label_style)],
        [Paragraph("Assinatura do Técnico Operacional", value_style),
         Paragraph("Assinatura do Solicitante / Responsável", value_style)]
    ]
    sig_table = Table(sig_data, colWidths=[270, 270])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,1), (-1,1), 4),
    ]))
    story.append(Spacer(1, 40))
    story.append(sig_table)
    
    doc.build(story)
    buffer.seek(0)
    return buffer
