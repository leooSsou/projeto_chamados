# 📌 GUIA DE CONTEXTO E HANDOFF DO PROJETO (CHAMADOS TI - GRAND HOTEL)

Este documento foi criado para fornecer **contexto 100% completo, técnico e operacional** do sistema para qualquer nova instância de Inteligência Artificial ou desenvolvedor após a reinstalação do sistema operacional.

---

## 🚀 1. Visão Geral da Aplicação

Sistema completo de Gerenciamento de Ordens de Serviço (OS) e Chamados de TI para o **Grand Hotel**. A plataforma permite a abertura, atendimento, priorização com SLA líquido, homologação, transbordo e disparo automático de notificações por e-mail via credenciais SMTP individuais por usuário.

### 🛠️ Tech Stack & Arquitetura
*   **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0 (sintaxe moderna `Mapped`/`mapped_column`), Alembic (migrações de banco), Pydantic v2 (schemas), Pytest (suíte de testes), ReportLab (geração de OS em PDF).
*   **Frontend**: React (Vite SPA), Vanilla CSS + Tailwind CSS v3, PostCSS, React Router DOM v6, Context API (`AuthContext`).
*   **Banco de Dados**: SQLite (`chamados.db`), versionado via Alembic migrations.
*   **Infraestrutura & Containerização**: Docker & Docker Compose (`docker-compose.yml`), script de inicialização concorrente `./start.sh`.

---

## 🔐 2. Controle de Acesso e Regras de Negócio (RBAC)

O sistema possui 4 perfis de usuário (`UserProfile` enum):
1.  **`Cliente`** (Recepção / Hóspedes / Colaboradores):
    *   Abre chamados (com upload de imagem e escolha de localidade: Quarto ocupado/vago ou Área Comum).
    *   Visualiza seus próprios chamados.
    *   **Homologa** (conclui definitivamente) ou **Reabre** chamados resolvidos.
    *   Acessa a aba "Configurações" para salvar suas credenciais SMTP pessoais.
2.  **`Técnico`** (TI Operacional):
    *   Visualiza a fila de chamados de TI.
    *   Executa ações no ciclo de vida: **Iniciar**, **Pausar**, **Retomar** e **Concluir** (obrigatório campo de diagnóstico).
    *   Acessa a aba "Configurações" para salvar suas credenciais SMTP pessoais.
3.  **`Supervisor`** (Chefia de TI):
    *   Possui privilégios totais de leitura e alteração.
    *   Gerencia colaboradores na tela `/usuarios` (cria contas com senhas temporárias).
    *   Realiza o **Transbordo / Transferência de Fila** entre departamentos com registro de justificativa no banco (`logs_transferencia`).
4.  **`Gerente`**: Perfil executivo para auditoria e relatórios.

---

## ⏱️ 3. Regras de SLA e Triagem Automática

*   **Triagem de Fila**: Chamados com categoria `"Tecnologia"` são direcionados automaticamente para a fila `"TI"`.
*   **Cálculo Dinâmico de SLA**:
    *   **Prioridade ALTA (SLA de 2 Horas)**: Ocorrências em quartos ocupados para as subcategorias *Wi-Fi*, *Fechadura Eletrônica* ou *TV / VoIP*.
    *   **Prioridade MÉDIA/BAIXA (SLA de 24 Horas)**: Demais localidades e áreas comuns.
*   **Código Único de OS**: Formato sequencial atômico `OS-YYYY-MM-XXXX` (ex: `OS-2026-07-0004`), imune a colisões de concorrência com retry loop no SQLite.

---

## 📧 4. Arquitetura de Notificações por E-mail (SMTP Individual)

*   **Persistência Per-User**: Os parâmetros SMTP (`smtp_host`, `smtp_port`, `smtp_user`, `smtp_password`, `smtp_from`) são salvos diretamente na tabela `usuarios` (modelo `User`). A antiga tabela global `configuracoes` foi removida.
*   **Roteamento Dinâmico de Remetente**: O envio de e-mails em background (`send_email_in_background`) lê as credenciais da conta do usuário que iniciou a ação no sistema (`sender_user_id`).
*   **Remetente Automático (From)**: O backend sincroniza automaticamente `smtp_from` com o `smtp_user` para evitar bloqueios anti-spam.
*   **Notificação de Criação**: Quando um cliente abre um chamado, a função varre o banco e envia o alerta para **todos os Técnicos e Supervisores ativos** cadastrados na tabela de usuários.
*   **Notificação de Conclusão**: Quando o técnico conclui um chamado, o e-mail de solução é enviado diretamente para a caixa do Cliente solicitante.

---

## ✅ 5. Status de Testes e Qualidade

*   **Suíte Backend (Pytest)**: **63 testes automatizados (100% APROVADOS)**.
    ```bash
    docker compose run --rm backend python3 -m pytest
    ```
*   **Frontend SPA**: Compilando sem nenhum erro via Vite (`npm run build`).

---

## 🎯 6. PONTO EXATO DE PARADA & TAREFAS PENDENTES

Quando você reinstalar o sistema e iniciar a IA, **peça para ela continuar destas pendências exatamente registradas**:

### 🔴 Pendência 1: Diagnóstico e Ajuste do SMTP Locaweb do Técnico
*   **Status Atual**: 
    *   O envio por contas **Gmail** (usando Senha de App) está **100% verificado e funcionando** (os e-mails saem com sucesso).
    *   O teste de envio usando a conta do Técnico com a **Locaweb** (`tecnologia@acalantohoteis.com.br`) conectou com sucesso no host `smtplw.com.br` na porta `465`, mas o servidor da Locaweb retornou o erro `(535, Error: authentication failed)`.
*   **Próxima Ação**:
    *   Verificar com o usuário se o e-mail da Locaweb é uma caixa de e-mail corporativo comum (neste caso, deve-se usar o host `smtp.locaweb.com.br` na porta `587` com a senha do webmail) ou se é a plataforma dedicada "SMTP Locaweb" (que exige token de API gerado no painel).

### 🟡 Pendência 2: Pop-up / Modal de Detalhes do Chamado na Tabela
*   **Solicitação do Usuário**: *"quero que eu consiga acessar o chamado, quando se clicar nela eu consiga acessar ela aberta com mais detalhes. abra como um 'pop-up'."*
*   **Próxima Ação**:
    *   Criar o modal/pop-up de visualização detalhada em `frontend/src/components/ChamadoModal.jsx` (ou novo componente `ChamadoDetalheModal.jsx`) e acioná-lo ao clicar em qualquer linha da tabela de chamados no `Chamados.jsx`.

### 🟢 Pendência 3: Commit e Push do Código
*   **Branch Atual**: `feature/configuracao-email`.
*   **Próxima Ação**: Realizar o `git add .` e `git commit` com a mensagem apropriada após resolver as pendências de teste do usuário.

---

## 💻 7. Como Subir o Projeto no Novo Sistema Operacional

1.  **Clonar o Repositório** (ou acessar a pasta do projeto):
    ```bash
    cd /caminho/para/projeto_chamados
    ```
2.  **Iniciar a Aplicação Completa**:
    ```bash
    chmod +x start.sh
    ./start.sh
    ```
    *O script iniciará o container do backend no Docker e a interface React em `http://localhost:5173`.*

3.  **Rodar a Suíte de Testes para Validar**:
    ```bash
    docker compose run --rm backend python3 -m pytest
    ```

---

*Este documento foi gerado automaticamente pelo assistente AI Antigravity para garantir continuidade perfeita de desenvolvimento.*
