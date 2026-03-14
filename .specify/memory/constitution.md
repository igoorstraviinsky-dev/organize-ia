<!--
Sync Impact Report:
- Version Change: 3.0.0 -> 3.1.0
- New Principles:
    - Zero-Build Deployment: O uso de GHCR para imagens pré-compiladas é o padrão oficial.
    - Unified Observability: Monitoramento de logs unificado no terminal da VPS para saúde B2B.
- Modified Principles:
    - Principle VII (Isolated Architecture): Reforço da Blindagem de Tenant no Agente Python.
- Governance Update: vps_update.sh evolui de script de deploy para "Painel de Controle e Monitoramento".
-->
# Organizador Constitution

## Core Principles

### I. RLS-First Security

O controle de acesso e a segurança dos dados DEVEM ser implementados primariamente via Row Level Security (RLS) no Supabase. O código frontend e backend deve ser o mais simples possível, confiando que o banco de dados filtrará as informações corretamente.

### II. Agente-Centric UX

O sistema deve ser plenamente funcional através de agentes de IA (WhatsApp/n8n). Todas as funcionalidades expostas na interface visual devem ter ferramentas equivalentes (Functions/MCP) para que a IA possa gerenciar o fluxo de trabalho do usuário.

### III. Premium Visual Identity

Toda interface visual (Web e Mobile) deve seguir os padrões de "Glassmorphism" e gradientes neon (Violet/Indigo/Emerald). A estética e a experiência do usuário (UX) são prioridades inegociáveis. A personalização das entidades, como a `theme_color` de projetos, DEVE ser respeitada globalmente por todos os componentes.

### IV. Orchestration via n8n/OpenAI

Lógicas complexas de negócios e integrações externas devem ser preferencialmente orquestradas via n8n ou agentes OpenAI, mantendo o core da aplicação limpo e focado em persistência e visualização.

### V. Atomic Task Management

A unidade fundamental do sistema é a Tarefa. Cada tarefa deve possuir estados claros, metadados de tempo (due_date/time) e possibilidade de organização em Projetos e Seções para maximizar a produtividade.

### VI. Centralized Navigation Paradigm

A navegação web principal baseia-se num modelo de Dashboard centralizado focado no Inbox (Tarefas Gerais ou visualização Global). Acessos a projetos ou outras ramificações complexas DEVEM ocorrer por meio de componentes de interface sobrepostos ou secundários (ex: Drawer lateral/pop-overs), garantindo que a tela central seja sempre focada na ação.

### VII. Type-Safe & Isolated Architecture (Strict First)

O uso de TypeScript é OBRIGATÓRIO em todos os módulos. 
1. **Strict Mode**: O servidor DEVE rodar em modo estrito sem exceções de `any`.
2. **Blindagem B2B (MANDATÓRIA)**: O isolamento de usuários B2B deve ser garantido por `tenant_id`. No Agente Python, toda ferramenta (tool) DEVE injetar e validar o `tenant_id` da instância de origem, agindo como defesa absoluta contra vazamento de dados.
3. **Interfaces de Contrato**: Comunicações tipadas preventivamente.

### VIII. Resilient Real-Time Orchestration (Live Mode)

Prioridade total para integridade de conexões SSE. Heartbeat e reconexão automática são obrigatórios.
**Auditoria Integrada**: Toda interação chave deve registrar geolocalização e metadados de auditoria corporativa.

### IX. Immutable Infrastructure & Zero-Build Deployment

O padrão de execução é a imutabilidade absoluta.
1. **Zero-Build standard**: O deploy em produção NÃO DEVE realizar builds locais. Imagens DEVEM ser construídas no CI/CD e publicadas no **GitHub Container Registry (GHCR)**.
2. **VPS Control Loop**: O script `vps_update.sh` evolui para um painel de monitoramento que realiza o `pull` das imagens prontas e oferece logs unificados dos serviços.
3. **CI/CD Gatekeeper**: GitHub Actions é o único caminho para produção.

### X. B2B Operability & Observability

A saúde do ecossistema B2B depende de visibilidade total.
1. **Logs Unificados**: É OBRIGATÓRIO que o painel de controle (VPS) ofereça acesso imediato aos logs em tempo real de todos os containers simultaneamente para diagnóstico rápido.

## Tecnologias e Padrões

- **Container Registry**: GHCR (GitHub Container Registry).
- **Monitoring**: Docker Compose Logs (Tail mode).
- **Security**: Injeção dinâmica de Tenant Context no Agente Python.

**Version**: 3.1.0 | **Ratified**: 2026-03-14 | **Last Amended**: 2026-03-14
