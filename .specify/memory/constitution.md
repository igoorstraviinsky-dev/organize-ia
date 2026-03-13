<!--
Sync Impact Report:
- Version Change: 2.1.0 -> 3.0.0
- New Principles:
    - Principle IX (Immutable Infrastructure & Deployment): Docker as the absolute environment standard; GitHub Actions as the sole production gatekeeper.
- Modified Principles:
    - Principle VIII (Resilient Real-Time Orchestration): Added requirements for SSE heartbeat mechanism and automatic reconnection patterns.
- Governance Update: Explicit prohibition of manual scripts (vps_update.sh, iniciar_tudo.bat) after CI/CD validation.
- Templates requiring updates: ✅ Templates remained aligned.
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

A navegação web principal baseia-se num modelo de Dashboard centralizado focado no Inbox (Tarefas Gerais ou visualização Global). Acessos a projetos ou outras ramificações complexas DEVEM ocorrer por meio de componentes de interface sobrepostos ou secundários (ex: Drawer lateral/pop-overs), garantindo que a tela central seja sempre focada na ação (o que está solto ou agendado para o momento atual).

### VII. Type-Safe & Isolated Architecture (Strict First)

O uso de TypeScript é OBRIGATÓRIO em todos os módulos (server, agent, client). 
1. **Strict Mode**: O servidor DEVE rodar em modo estrito (`strict: true`) sem exceções de `any`.
2. **Blindagem B2B**: O isolamento de usuários e clientes B2B DEVE ser garantido por interfaces e tipos que forcem o filtro de `tenant_id` ou `owner_id` em todas as camadas de abstração de dados, agindo como uma segunda camada de defesa além do RLS.
3. **Interfaces de Contrato**: Comunicações entre módulos devem ser tipadas preventivamente para evitar vazamentos de dados brutos do banco.

### VIII. Resilient Real-Time Orchestration (Live Mode)

O sistema DEVE priorizar a integridade das conexões de longa duração. 
1. **SSE (Server-Sent Events)**: A lógica de transmissão em tempo real deve ser fortemente tipada e resiliente a quedas de proxy/nginx. É OBRIGATÓRIA a implementação de um mecanismo de **heartbeat** (ping/pong) e lógica de **reconexão automática** no client para eliminar loops de carregamento infinitos.
2. **Auditoria de Estado**: Garantir que atualizações de geolocalização e precificação dinâmica (metais) sejam propagadas instantaneamente via canais tipados, mantendo o "Live Mode" inquebrável.

### IX. Immutable Infrastructure & Deployment

O padrão de execução do Organizador é a imutabilidade e a automação.
1. **Dockerização**: O uso de Docker e Docker Compose é o padrão MANDATÓRIO para desenvolvimento e produção. O conceito "funciona na minha máquina" está proibido; se não roda no container, não é considerado código válido.
2. **CI/CD Gatekeeper**: O GitHub Actions passa a ser o único guardião (gatekeeper) para o ambiente de produção. Deploys manuais são permitidos apenas durante a fase de transição técnica.


## Tecnologias e Padrões

### Stack Tecnológica

- **Frontend**: Next.js (TypeScript), React Native (Expo/TypeScript), Lucide Icons, Vanilla CSS (Glassmorphism), framer-motion (Animações de UI).
- **Backend/API**: Node.js (Express/TypeScript), Python (Agentes AI com tipagem estrita/Pydantic), OpenAI API, UazAPI (WhatsApp).
- **Database**: Supabase (PostgreSQL, RLS, Auth).
- **Automação**: n8n (Workflow Orchestration).

## Workflow de Desenvolvimento

### Garantia de Qualidade

- Alterações em RLS devem ser testadas contra múltiplos perfis (Admin e Colaborador).
- Novas funcionalidades DEVEM ser acompanhadas de documentação evolutiva (ex: atualização sistemática do `conversaia.md` e geração de walkthroughs).
- Commits devem ser descritivos e seguir o padrão de conventional commits.
- **Dívida Técnica**: O extermínio de arquivos `.js` em favor de `.ts` (Server) e Python tipado (Agent) é prioridade absoluta.
- **Depreciação de Scripts**: Scripts manuais (`iniciar_tudo.bat`, `vps_update.sh`) devem ser marcados como depreciados e removidos assim que o pipeline de CI/CD for validado.

## Governance

Esta constituição prevalece sobre práticas ad-hoc. Mudanças estruturais exigem atualização deste documento e revisão de todos os artefatos de especificação e tarefas afetados.

**Version**: 3.0.0 | **Ratified**: 2026-03-08 | **Last Amended**: 2026-03-13
