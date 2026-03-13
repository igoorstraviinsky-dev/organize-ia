# Feature Specification: TypeScript Migration (Phase 1)

**Feature Branch**: `002-ts-migration-phase-1`
**Created**: 2026-03-13
**Status**: Approved
**Input**: Migrar a base de código de 64,5% JavaScript para TypeScript nos módulos server/ e agent/, priorizando estabilidade, segurança e tipagem dos contratos críticos de negócio.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operações do Agente sem erros de runtime (Priority: P1)

O agente de IA (via WhatsApp) realiza operações de criação, listagem, atribuição e conclusão de tarefas sem que erros de tipo causem falhas silenciosas ou divergências de dados.

**Why this priority**: Erros de runtime no agente representam impacto direto no usuário final, que vê mensagens incompreensíveis ou perde dados.

**Independent Test**: Pode ser testado enviando comandos ao WhatsApp e verificando que as respostas estão corretas, as datas não derivam e os dados RLS estão isolados por usuário.

**Acceptance Scenarios**:

1. **Given** um usuário válido enviando mensagem via WhatsApp, **When** o agente processa a criação de uma tarefa com data, **Then** a tarefa é gravada com a data exata informada (timezone BRT correto) sem erros de tipo.
2. **Given** um usuário colaborador, **When** lista as tarefas via agente, **Then** recebe apenas suas próprias tarefas (isolamento RLS mantido) sem erro de runtime.

---

### User Story 2 - SSE estável e sem memory leaks (Priority: P2)

O servidor SSE (Server-Sent Events) envia eventos em tempo real ao frontend sem cair, vazar memória ou perder conexões de clientes.

**Why this priority**: O SSE é o canal de atualização em tempo real do dashboard. Instabilidades causam UI desatualizada.

**Independent Test**: Pode ser validado mantendo o dashboard aberto por 30 minutos e verificando que os eventos chegam continuamente sem restart do server.

**Acceptance Scenarios**:

1. **Given** o cliente conectado via SSE, **When** uma tarefa é criada por qualquer meio, **Then** o frontend recebe o evento em menos de 2 segundos sem erros de tipo no handler.
2. **Given** múltiplos clientes conectados, **When** um deles desconecta, **Then** os demais continuam recebendo eventos sem memory leak.

---

### User Story 3 - Contrato WhatsApp/UazAPI tipado (Priority: P3)

As integrações com o UazAPI (envio de mensagens, webhooks) operam sem falhas causadas por propriedades inesperadas ou nulas em payloads.

**Why this priority**: Webhooks malformados atualmente disparam crashes silenciosos. A tipagem pevente isso.

**Independent Test**: Pode ser validado enviando um payload malformado ao webhook e verificando que o sistema rejeita graciosamente com log estruturado.

**Acceptance Scenarios**:

1. **Given** um webhook recebido do UazAPI, **When** o payload não contém o campo `phoneNumber`, **Then** o sistema loga o erro estruturado e retorna 400, sem crash.

---

### Edge Cases

- O que acontece quando um usuário sem perfil no banco envia mensagem ao WhatsApp?
- Como o sistema lida com `due_date` nulo em operações de listagem?
- O que ocorre quando o bloqueio temporário de 15 minutos expira enquanto o usuário está em mid-request?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Todos os arquivos `.js` em `server/src/` DEVEM ser migrados para `.ts` com tipagem explícita.
- **FR-002**: O `tsconfig.json` DEVE ser configurado com `strict: true` e `allowJs: true` para migração progressiva.
- **FR-003**: Interfaces para todas as entidades do banco de dados (profiles, tasks, projects, sections, assignments, labels) DEVEM ser definidas em `server/src/types/`.
- **FR-004**: O sistema de bloqueio temporário de 15 minutos DEVE ter tipos explícitos para `BlockedUser` e `BlockRecord` com `userId: string`, `until: Date`, `reason: string`.
- **FR-005**: O `executor.js` e `openai.js` no agent DEVEM ser convertidos para `.ts` sem quebrar o fluxo de WhatsApp.
- **FR-006**: O `ecosystem.config.js` do PM2 DEVE apontar para o output compilado (`dist/`) após o build TypeScript.
- **FR-007**: O script de build (`tsc`) DEVE ser adicionado ao `package.json` como `"build": "tsc"` e `"start": "node dist/index.js"`.
- **FR-008**: O tipo `any` DEVE ser eliminado; onde impossível de imediato, usar `unknown` com type guards explícitos.

### Key Entities

- **Profile**: `{ id: string; full_name: string; email: string; phone: string | null; role: 'admin' | 'collaborator' }`
- **Task**: `{ id: string; title: string; status: 'pending' | 'in_progress' | 'completed'; project_id: string | null; due_date: string | null; due_time: string | null; created_by: string; completed_at: string | null }`
- **Project**: `{ id: string; name: string; owner_id: string; color: string; theme_color: string }`
- **Section**: `{ id: string; title: string; project_id: string; position: number }`
- **Assignment**: `{ task_id: string; user_id: string }`
- **BlockRecord**: `{ userId: string; until: Date; reason: string }`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero erros TypeScript (`tsc --noEmit`) após a migração completa dos arquivos de `server/src/`.
- **SC-002**: O agente WhatsApp responde corretamente em 100% dos cenários de criação e listagem testados após a migração.
- **SC-003**: Nenhum uso de `any` explícito nos arquivos migrados (verificável via `grep -r ': any' server/src/`).
- **SC-004**: O PM2 sobe o processo `organizador-api` a partir do código compilado sem erros após `npm run build`.
- **SC-005**: O SSE permanece estável por pelo menos 30 minutos sem `server restart` em ambiente de homologação.
