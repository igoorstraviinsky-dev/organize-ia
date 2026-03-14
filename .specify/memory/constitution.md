<!--
Sync Impact Report:
- Version Change: 1.0.0 -> 1.1.0
- Modified Principles: Principle III (Premium Visual Identity) updated to mandate theme_color consistency.
- Added Sections: Principle VI (Centralized Navigation Paradigm) added to codify the "Inbox Focus" and "Panel de Projetos Superior" UI patterns.
- Removed Sections: None.
- Templates requiring updates: ✅ None needed. Generic constitution checks in templates remain valid.
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

## Tecnologias e Padrões

### Stack Tecnológica

- **Frontend**: Next.js (React), React Native (Expo), Lucide Icons, Vanilla CSS (Glassmorphism), framer-motion (Animações de UI).
- **Backend/API**: Node.js (Express), Python (Agentes AI), OpenAI API, UazAPI (WhatsApp).
- **Database**: Supabase (PostgreSQL, RLS, Auth).
- **Automação**: n8n (Workflow Orchestration).

## Workflow de Desenvolvimento

### Garantia de Qualidade

- Alterações em RLS devem ser testadas contra múltiplos perfis (Admin e Colaborador).
- Novas funcionalidades DEVEM ser acompanhadas de documentação evolutiva (ex: atualização sistemática do `conversaia.md` e geração de walkthroughs).
- Commits devem ser descritivos e seguir o padrão de conventional commits.

## Governance

Esta constituição prevalece sobre práticas ad-hoc. Mudanças estruturais exigem atualização deste documento e revisão de todos os artefatos de especificação e tarefas afetados.

**Version**: 1.1.0 | **Ratified**: 2026-03-08 | **Last Amended**: 2026-03-11
