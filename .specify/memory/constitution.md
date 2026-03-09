# Organizador Constitution

## Core Principles

### I. RLS-First Security

O controle de acesso e a segurança dos dados DEVEM ser implementados primariamente via Row Level Security (RLS) no Supabase. O código frontend e backend deve ser o mais simples possível, confiando que o banco de dados filtrará as informações corretamente.

### II. Agente-Centric UX

O sistema deve ser plenamente funcional através de agentes de IA (WhatsApp/n8n). Todas as funcionalidades expostas na interface visual devem ter ferramentas equivalentes (Functions/MCP) para que a IA possa gerenciar o fluxo de trabalho do usuário.

### III. Premium Visual Identity

Toda interface visual (Web e Mobile) deve seguir os padrões de "Glassmorphism" e gradientes neon (Violet/Indigo/Emerald). A estética e a experiência do usuário (UX) são prioridades inegociáveis.

### IV. Orchestration via n8n/OpenAI

Lógicas complexas de negócios e integrações externas devem ser preferencialmente orquestradas via n8n ou agentes OpenAI, mantendo o core da aplicação limpo e focado em persistência e visualização.

### V. Atomic Task Management

A unidade fundamental do sistema é a Tarefa. Cada tarefa deve possuir estados claros, metadados de tempo (due_date/time) e possibilidade de organização em Projetos e Seções para maximizar a produtividade.

## Tecnologias e Padrões

### Stack Tecnológica

- **Frontend**: Next.js, React Native (Expo), Lucide Icons, Vanilla CSS (Glassmorphism).
- **Backend/API**: Node.js (Express), OpenAI API, UazAPI (WhatsApp).
- **Database**: Supabase (PostgreSQL, RLS, Auth).
- **Automação**: n8n (Workflow Orchestration).

## Workflow de Desenvolvimento

### Garantia de Qualidade

- Alterações em RLS devem ser testadas contra múltiplos perfis (Admin e Colaborador).
- Novas funcionalidades devem ser documentadas em `atualizacao.md`.
- Commits devem ser descritivos e seguir o padrão de conventional commits.

## Governance

Esta constituição prevalece sobre práticas ad-hoc. Mudanças estruturais exigem atualização deste documento e revisão de todos os artefatos de especificação e tarefas afetados.

**Version**: 1.0.0 | **Ratified**: 2026-03-08 | **Last Amended**: 2026-03-08
