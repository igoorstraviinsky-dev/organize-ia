# Tasks: TypeScript Migration Phase 1

**Branch**: `002-ts-migration-phase-1`
**Created**: 2026-03-13
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Clarify**: [clarify.md](./clarify.md)
**Status**: 🔴 Not Started

---

## GRUPO 0 — Infraestrutura e Configuração TypeScript

> Pré-requisito para todas as tarefas seguintes. Sem isso, nenhuma conversão compila.

### TASK-001 — Instalar dependências TypeScript no server
- **Arquivo**: `server/package.json`
- **Ação**: Instalar `typescript`, `@types/node`, `@types/express`, `@types/cors`, `ts-node` como devDependencies
- **Comando**: `npm install -D typescript @types/node @types/express @types/cors tsx`
- **Status**: 🔴 Not Started

### TASK-002 — Criar tsconfig.json no server
- **Arquivo**: `server/tsconfig.json` (criar)
- **Conteúdo**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "allowJs": true,
    "noImplicitAny": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```
- **Status**: 🔴 Not Started

### TASK-003 — Atualizar scripts no package.json do server
- **Arquivo**: `server/package.json`
- **Ação**: Adicionar scripts `build`, `dev:ts`, atualizar `start`
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  }
}
```
- **Status**: 🔴 Not Started

### TASK-004 — Criar diretório de tipos globais
- **Arquivo**: `server/src/types/` (criar diretório)
- **Sub-arquivos**:
  - `server/src/types/supabase.ts` — interfaces das entidades do banco
  - `server/src/types/express.d.ts` — augmentação do Request
  - `server/src/types/agent.ts` — tipos do agente AI
  - `server/src/types/index.ts` — re-exports
- **Status**: 🔴 Not Started

### TASK-005 — Atualizar ecosystem.config.js para apontar para dist/
- **Arquivo**: `ecosystem.config.js`
- **Ação**: Alterar `script: "src/index.js"` para `script: "dist/index.js"` na app `organizador-api`
- **Nota**: Manter `src/index.js` como fallback enquanto a migração está em andamento
- **Status**: 🔴 Not Started

---

## GRUPO 1 — Definição de Tipos (Fundação)

> Deve ser concluído antes de qualquer migração de arquivo.

### TASK-006 — Criar interfaces das entidades Supabase
- **Arquivo**: `server/src/types/supabase.ts`
- **Conteúdo**: `Profile`, `Task`, `Project`, `Section`, `Assignment`, `Label`, `Integration`, `AiAgentSettings`, `ChatMessage`
- **Atenção**: `due_date` e `due_time` são `string | null` (nunca `Date`) — regra de negócio crítica do timezone BRT
- **Status**: 🔴 Not Started

### TASK-007 — Criar augmentação do Express Request
- **Arquivo**: `server/src/types/express.d.ts`
- **Conteúdo**: Adicionar `user?: User` e `sb?: SupabaseClient` ao namespace `Express.Request`
- **Status**: 🔴 Not Started

### TASK-008 — Criar tipos do Agente AI
- **Arquivo**: `server/src/types/agent.ts`
- **Conteúdo**: `BlockRecord`, `FunctionExecutor`, `AgentFunctionMap`, `ParsedSSEMessage`, `SSEHandle`, `SSEIntegration`
- **Status**: 🔴 Not Started

---

## GRUPO 2 — Migração da Camada Base (sem dependências internas)

> Arquivos mais simples, que não dependem uns dos outros.

### TASK-009 — Migrar server/src/lib/supabase.js → supabase.ts
- **Arquivo**: `server/src/lib/supabase.js` → `server/src/lib/supabase.ts`
- **Mudanças**:
  - Tipar o cliente: `export const supabase: SupabaseClient`
  - Adicionar verificação de env vars com `!` assertion ou throw
- **Status**: 🔴 Not Started

### TASK-010 — Migrar server/src/middleware/auth.js → auth.ts
- **Arquivo**: `server/src/middleware/auth.js` → `server/src/middleware/auth.ts`
- **Mudanças**:
  - `req: Request, res: Response, next: NextFunction` tipados
  - `req.user` e `req.sb` usando augmentação do TASK-007
- **Status**: 🔴 Not Started

### TASK-011 — Migrar server/src/lib/whatsapp.js → whatsapp.ts
- **Arquivo**: `server/src/lib/whatsapp.js` → `server/src/lib/whatsapp.ts`
- **Status**: 🔴 Not Started

### TASK-012 — Migrar server/src/lib/openai.js → openai.ts (lib)
- **Arquivo**: `server/src/lib/openai.js` → `server/src/lib/openai.ts`
- **Status**: 🔴 Not Started

### TASK-013 — Migrar server/src/services/morning-summary.js → morning-summary.ts
- **Arquivo**: `server/src/services/morning-summary.js` → `server/src/services/morning-summary.ts`
- **Status**: 🔴 Not Started

---

## GRUPO 3 — Migração das Rotas

> Depende do GRUPO 2 (middleware auth tipado).

### TASK-014 — Migrar server/src/routes/auth.js → auth.ts
- **Arquivo**: `server/src/routes/auth.js` → `server/src/routes/auth.ts`
- **Status**: 🔴 Not Started

### TASK-015 — Migrar server/src/routes/ai.js → ai.ts
- **Arquivo**: `server/src/routes/ai.js` → `server/src/routes/ai.ts`
- **Status**: 🔴 Not Started

### TASK-016 — Migrar server/src/routes/config.js → config.ts
- **Arquivo**: `server/src/routes/config.js` → `server/src/routes/config.ts`
- **Status**: 🔴 Not Started

### TASK-017 — Migrar server/src/routes/team.js → team.ts
- **Arquivo**: `server/src/routes/team.js` → `server/src/routes/team.ts`
- **Status**: 🔴 Not Started

### TASK-018 — Migrar server/src/routes/webhook.js → webhook.ts
- **Arquivo**: `server/src/routes/webhook.js` → `server/src/routes/webhook.ts`
- **Status**: 🔴 Not Started

### TASK-019 — Migrar server/src/routes/uazapi.js → uazapi.ts
- **Arquivo**: `server/src/routes/uazapi.js` → `server/src/routes/uazapi.ts`
- **Status**: 🔴 Not Started

---

## GRUPO 4 — Migração do Agente AI (Crítico)

> Arquivos mais críticos. Erros aqui afetam WhatsApp em produção.

### TASK-020 — Migrar server/src/agent/functions.js → functions.ts
- **Arquivo**: `server/src/agent/functions.js` → `server/src/agent/functions.ts`
- **Mudanças**: Tipar o array `tools: ChatCompletionTool[]` (da lib openai)
- **Status**: 🔴 Not Started

### TASK-021 — Criar interfaces de parâmetros do executor
- **Arquivo**: `server/src/types/agent.ts` (expandir)
- **Conteúdo**: `CreateTaskParams`, `EditTaskParams`, `DeleteTaskParams`, `ListTasksParams`, `AssignTaskParams`, etc.
- **Atenção**: Todos precisam de `phoneNumber: string` como campo obrigatório
- **Status**: 🔴 Not Started

### TASK-022 — Migrar server/src/agent/executor.js → executor.ts (PARTE 1 — resolvers)
- **Arquivo**: `server/src/agent/executor.js` → `server/src/agent/executor.ts`
- **Escopo**: Funções internas: `resolveUserId`, `resolveUser`, `resolveProject`, `resolveSection`, `resolveLabels`, `isAdmin`, `sendAssignmentNotification`
- **Status**: 🔴 Not Started

### TASK-023 — Migrar executor.ts (PARTE 2 — CRUD de tasks)
- **Escopo**: `createTask`, `editTask`, `deleteTask`, `deleteAllUserTasks`
- **Status**: 🔴 Not Started

### TASK-024 — Migrar executor.ts (PARTE 3 — CRUD de projetos e labels)
- **Escopo**: `createProject`, `editProject`, `deleteProject`, `listLabels`, `searchLabels`, `assignTask`, `assignProjectMember`, `removeProjectMember`
- **Status**: 🔴 Not Started

### TASK-025 — Migrar executor.ts (PARTE 4 — listagens e outros)
- **Escopo**: `listTasks`, `listProjects`, `searchTasks`, `searchProjects`, `updateStatus`, `sendMessage`, `startFocusSession`, `endFocusSession`, `updateAiSettings`
- **Status**: 🔴 Not Started

### TASK-026 — Migrar server/src/agent/openai.js → openai.ts (agente)
- **Arquivo**: `server/src/agent/openai.js` → `server/src/agent/openai.ts`
- **Mudanças**:
  - `CHAT_MEMORY: Map<string, ChatCompletionMessageParam[]>`
  - `functionExecutors: AgentFunctionMap` tipado
  - `processMessage(userMessage: string, phoneNumber: string, base64Image?: string | null): Promise<string>`
- **Status**: 🔴 Not Started

---

## GRUPO 5 — Migração do SSE (Alta Complexidade)

> Depende do UazAPI client tipado. Fazer por último no server.

### TASK-027 — Migrar server/src/lib/uazapi.js → uazapi.ts
- **Arquivo**: `server/src/lib/uazapi.js` → `server/src/lib/uazapi.ts`
- **Mudanças**: Definir `UazApiConfig`, `SendMessageParams`, `ParsedWebhookMessage`, `DownloadMediaParams`
- **Status**: 🔴 Not Started

### TASK-028 — Migrar server/src/lib/sseClient.js → sseClient.ts
- **Arquivo**: `server/src/lib/sseClient.js` → `server/src/lib/sseClient.ts`
- **Mudanças**:
  - `activeConnections: Map<string, SSEHandle>`
  - `logBuffers: Map<string, LogEntry[]>`
  - `transcriptionCache: Map<string, string>`
  - `handleSSEEvent(eventName: string | null, rawData: string, integration: SSEIntegration): Promise<void>`
- **Atenção**: Usar `unknown` no `JSON.parse()` + type guard para payload do SSE
- **Status**: 🔴 Not Started

---

## GRUPO 6 — Entry Point e Build

### TASK-029 — Migrar server/src/index.js → index.ts
- **Arquivo**: `server/src/index.js` → `server/src/index.ts`
- **Mudanças**: Atualizar imports para `.js` (resolução NodeNext), PORT tipado como `number`
- **Status**: 🔴 Not Started

### TASK-030 — Executar build e verificar zero erros TypeScript
- **Ação**: `cd server && npm run build`
- **Critério de sucesso**: Zero erros de compilação (`tsc --noEmit` retorna exit code 0)
- **Status**: 🔴 Not Started

### TASK-031 — Verificar zero uso de `any` explícito
- **Ação**: `grep -rn ": any" server/src/` — resultado deve ser vazio
- **Status**: 🔴 Not Started

### TASK-032 — Testar fluxo WhatsApp pós-migração
- **Ação**: Enviar mensagem de teste via WhatsApp e verificar resposta correta
- **Critério**: Resposta em <5s, sem erros no log, dados corretos no banco
- **Status**: 🔴 Not Started

### TASK-033 — Atualizar ecosystem.config.js para produção
- **Ação**: Confirmar que `script: "dist/index.js"` está apontando para o build compilado
- **Status**: 🔴 Not Started

---

## Análise (/speckit.analyze)

### Cobertura de Tipagem

| Módulo | Arquivo | Prioridade | Risco |
|--------|---------|------------|-------|
| Infraestrutura | `tsconfig.json`, `package.json` | CRÍTICA | Baixo |
| Tipos Globais | `types/supabase.ts`, `types/agent.ts`, `types/express.d.ts` | CRÍTICA | Baixo |
| Middleware | `middleware/auth.ts` | CRÍTICA | Baixo |
| Agente | `agent/executor.ts`, `agent/openai.ts` | CRÍTICA | Alto |
| SSE | `lib/sseClient.ts` | ALTA | Alto |
| UazAPI | `lib/uazapi.ts` | ALTA | Médio |
| Rotas | `routes/*.ts` | MÉDIA | Baixo |
| Serviços | `services/morning-summary.ts` | BAIXA | Baixo |

### Consistência entre Artefatos

- ✅ **spec.md ↔ plan.md**: Todos os FRs da spec têm tasks correspondentes
- ✅ **plan.md ↔ tasks.md**: Data model do plano traduzido em TASK-006, TASK-007, TASK-008
- ✅ **Princípio VII (Constitution) ↔ tasks.md**: TASK-031 verifica zero `any`; TASK-030 verifica zero erros TS
- ✅ **Princípio I (RLS) ↔ tasks.md**: TASK-007 garante tipagem do `req.sb` (cliente RLS-aware)
- ✅ **Clarify ↔ tasks.md**: `BlockRecord` definido em TASK-008; ESM imports documentados nas tasks de migração
- ⚠️ **Risco Residual**: `executor.ts` dividido em 4 sub-tasks (22-25) — se partes intermédias falharem, o arquivo fica em estado misto. Mitigação: usar `allowJs: true` para compilar em paralelo.

### Dependências entre Tasks

```
TASK-001 → TASK-002 → TASK-003
TASK-004 → TASK-006 → TASK-007 → TASK-008
TASK-009 → TASK-010 → [GRUPO 3]
TASK-020 → TASK-021 → TASK-022 → TASK-023 → TASK-024 → TASK-025 → TASK-026
TASK-027 → TASK-028
[TODOS OS GRUPOS] → TASK-029 → TASK-030 → TASK-031 → TASK-032 → TASK-033
```

**Total de Tasks**: 33
**Estimativa**: ~2-3 dias de implementação focada
