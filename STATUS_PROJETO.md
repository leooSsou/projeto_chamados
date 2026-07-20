# 📊 Status de Desenvolvimento do Sistema de Chamados TI & Manutenção Hoteleira

---

## 📌 Documentos Principais do Projeto
- 📄 **Especificação Arquitetural e Funcional**: [`documento_especificacao_chamados.md`](file:///home/souzza/projeto_chamados/documento_especificacao_chamados.md)
- 📋 **Matriz de Tarefas e Kanban**: [`trello_tasks.csv`](file:///home/souzza/projeto_chamados/trello_tasks.csv)

---

## 🚀 Status Geral do Projeto

| Módulo / Onda | Escopo | Status | Progresso |
| :--- | :--- | :--- | :--- |
| **Onda 1: Setup & Arquitetura** | Docker, FastAPI, SQLAlchemy, Alembic, Tailwind, Pytest | 🟢 Concluído | 100% |
| **Onda 2: Autenticação & Usuários** | JWT, Criptografia bcrypt, Troca de Senha, RBAC | 🟢 Concluído | 100% |
| **Onda 3: Ciclo de Vida do Chamado** | Abertura (Cascata), SLA Dinâmico (2h/24h), Pausa/Retomada, Conclusão com Foto, Reabertura e Transbordo | 🟢 Concluído | 100% |
| **Onda 4: PDF, E-mail & Frontend SPA** | Geração de OS PDF (ReportLab), E-mails SMTP/Resend, Interface React/Vite | 🟢 Concluído | 100% |
| **Onda 5: Integração & Telas Dinâmicas** | Telas de Cliente, Técnico e Supervisor conectadas às APIs REST | 🟢 Concluído | 100% |
| **Onda 6: Validação & DevOps** | QA Fim a Fim (E2E), Script de Backup SQLite | 🟡 Em Andamento / Próximo | 50% |
| **Backlog Pós-Go Live** | Painel Analítico de KPIs, WhatsApp Omnichannel, Integração PMS Hoteleiro | 🔵 Planejado | 0% |

---

## ✅ O Que Foi Feito (Detalhamento)

### 1. ⚙️ Backend (Python 3.11 / FastAPI)
- **Segurança e Usuários**:
  - Autenticação via Token JWT (`/auth/login`).
  - Troca obrigatória de senha no primeiro acesso (`/auth/alterar-senha`).
  - Cadastro de novos colaboradores por supervisores (`/usuarios`).
  - Controle de Acesso Baseado em Perfis (RBAC): *Cliente, Técnico, Supervisor, Gerente*.
- **Gestão de Chamados**:
  - Abertura de chamados com suporte a *Quarto* (Bloco/Andar/Quarto + flag de Hóspede Ocupado) ou *Área Comum*.
  - Motor de SLA automático: 2h para problemas críticos em quartos ocupados; 24h para chamados normais.
  - Ações operacionais com auditoria: *Iniciar Atendimento, Pausar (congelando tempo de SLA), Retomar (estendendo deadline), Concluir (com envio obrigatório de imagem de comprovante)*.
  - Homologação pelo cliente e Reabertura com justificativa e marcação de retrabalho.
  - Rota de **Transbordo / Transferência de Fila** por supervisores.
- **Relatórios e Notificações**:
  - Serviço de geração de Ordem de Serviço em PDF com ReportLab (`/chamados/{id}/os/download`).
  - Disparo de e-mails em segundo plano via `BackgroundTasks` do FastAPI e SMTP.
- **Qualidade & Testes**:
  - **61 testes unitários e de integração** automatizados com Pytest rodando e passando 100%.

### 2. 💻 Frontend (React / Vite + Tailwind CSS)
- **Interface Responsiva (Mobile-First)**:
  - Navbar horizontal estilizada no topo com atalhos de perfil e logout.
- **Tela do Cliente**:
  - Formulário dinâmico em cascata para seleção de localização.
  - Regra de visibilidade estendida para setor de *Recepção*.
  - Upload e preview de imagens de falha.
  - Painel de homologação/aprovação e reabertura com download do PDF da OS.
- **Tela do Técnico**:
  - Painel operacional com chamados ordenados por SLA.
  - Destaque visual (vermelho/alerta) para chamados críticos de 2h.
  - Botões de ação rápida (*Iniciar, Pausar, Retomar, Concluir*).
- **Tela do Supervisor**:
  - Gerenciamento e cadastro de colaboradores.
  - Modal dinâmico para transbordo/transferência de setor.

---

## 🎯 O Que Falta Ser Feito (Próximos Passos)

### 🔴 Próximas Tarefas Imediatas (Fase Atual)
1. **🧪 [QA] Bateria de Testes Fim a Fim (Jornada Completa)**:
   - Validação da experiência visual completa de abertura, atendimento, conclusão e emissão de PDF com o frontend e backend ativos simultaneamente.
2. **💾 [DevOps] Script de Backup Automatizado do Banco de Dados**:
   - Criação de um script shell para backup periódico da base SQLite (`chamados.db`).

### 🔵 Tarefas de Backlog (Fase Pós-Go Live / Futuras Melhorias)
1. **📊 [KPIs] Painel Analítico para Alta Gerência**:
   - Gráficos de compliance de SLA, MTTR (tempo médio de resolução) e carga de chamados por técnico.
2. **📱 [Notificações] Redundância Omnichannel via WhatsApp**:
   - Disparo de notificações de chamados críticos via API do WhatsApp.
3. **🏨 [Dados] Integração com Sistema de PMS (Hotel)**:
   - Integração com software de gestão hoteleira (PMS) para consulta automática de status de ocupação dos quartos.

---

*Última atualização: 20/07/2026*
