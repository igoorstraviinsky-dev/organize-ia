<!--
Sync Impact Report:
- Version Change: 1.1.0 -> 2.0.0
- Modified Principles: 
    - Added Principle VII (Type-Safe Architecture) mandating TypeScript, Strict Mode, and no 'any'.
    - Updated Stack Tecnológica to reflect TypeScript mandatory status across all modules (server, agent, client).
- Added Sections: Principle VII (Type-Safe Architecture).
- Removed Sections: None.
- Templates requiring updates: ✅ Generic constitution checks in templates remain valid.
- Follow-up TODOs: None.
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

### VII. Type-Safe Architecture (TypeScript First)

O uso de TypeScript é OBRIGATÓRIO em todos os módulos (server, agent, client). Deve-se adotar o 'Strict Mode' e evitar o uso de `any`, priorizando definições de tipos e interfaces baseadas nos esquemas do Supabase. A 'blindagem de usuários' e o 'isolamento RLS' devem ser reforçados por tipagem forte para garantir a segurança e prevenir regressões.

## Tecnologias e Padrões

### Stack Tecnológica

- **Frontend**: Next.js (TypeScript), React Native (Expo/TypeScript), Lucide Icons, Vanilla CSS (Glassmorphism), framer-motion (Animações de UI).
- **Backend/API**: Node.js (Express/TypeScript), Python (Agentes AI com tipagem estrita), OpenAI API, UazAPI (WhatsApp).
- **Database**: Supabase (PostgreSQL, RLS, Auth).
- **Automação**: n8n (Workflow Orchestration).

## Workflow de Desenvolvimento

### Garantia de Qualidade

- Alterações em RLS devem ser testadas contra múltiplos perfis (Admin e Colaborador).
- Novas funcionalidades DEVEM ser acompanhadas de documentação evolutiva (ex: atualização sistemática do `conversaia.md` e geração de walkthroughs).
- Commits devem ser descritivos e seguir o padrão de conventional commits.
- **Dívida Técnica**: Migrações de JS para TS são prioridade máxima para estabilidade e segurança.

## Governance

Esta constituição prevalece sobre práticas ad-hoc. Mudanças estruturais exigem atualização deste documento e revisão de todos os artefatos de especificação e tarefas afetados.

**Version**: 2.0.0 | **Ratified**: 2026-03-08 | **Last Amended**: 2026-03-13
