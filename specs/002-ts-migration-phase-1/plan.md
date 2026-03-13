# Implementation Plan: TypeScript Migration Phase 1

**Branch**: `002-ts-migration-phase-1` | **Date**: 2026-03-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/002-ts-migration-phase-1/spec.md`

## Summary

Migração progressiva dos módulos críticos `server/src/` de JavaScript para TypeScript, com foco em eliminar erros de runtime no agente WhatsApp e no SSE. A estratégia usa `allowJs: true` no `tsconfig.json` para permitir coexistência de arquivos `.js` e `.ts` durante a transição, priorizando os arquivos de maior risco (executor, openai, middleware).

## Technical Context

**Language/Version**: Node.js 18+ com TypeScript 5.x  
**Primary Dependencies**: Express, @supabase/supabase-js, openai, node-cron  
**Storage**: Supabase (PostgreSQL via RLS)  
**Testing**: Testes manuais via WhatsApp + health check endpoint  
**Target Platform**: Linux VPS (PM2 process manager)  
**Project Type**: Web API (Express) + Agente AI  
**Performance Goals**: Manter tempos de resposta atuais (<2s SSE, <5s AI)  
**Constraints**: Zero downtime — migração deve ser compatível com PM2 ecosystem atual  
**Scale/Scope**: 14 arquivos `.js` em `server/src/` para migrar + tipagem das entidades Supabase

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- ✅ **RLS-First Security**: Todas as tipagens de Request devem incluir `req.user` e `req.sb` (cliente RLS-aware).
- ✅ **Agente-Centric UX**: O fluxo WhatsApp (`executor.ts`, `openai.ts`) não pode ter breaking changes.
- ✅ **Type-Safe Architecture (VII)**: Strict Mode ativo, zero `any`, interfaces derivadas do schema Supabase.
- ✅ **Atomic Task Management (V)**: Tipos de `Task`, `Section`, `Assignment` cobrem todos os campos de criação.
- ✅ **Centralized Navigation (VI)**: Nenhum impacto no frontend (migração é só backend).

## Project Structure

### Documentation (this feature)

```text
specs/002-ts-migration-phase-1/
├── plan.md              # This file
├── spec.md              # Feature specification
├── data-model.md        # Definição das interfaces TypeScript (entidades Supabase)
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Gerado por /speckit.tasks
```

### Source Code (repository root)

```text
server/
├── tsconfig.json          # [NOVO] Config TS com strict + allowJs
├── package.json           # [ATUALIZAR] Adicionar deps TS + scripts build/dev:ts
├── src/
│   ├── types/             # [NOVO] Definições de tipos globais
│   │   ├── supabase.ts    # [NOVO] Interfaces das entidades do banco
│   │   ├── express.d.ts   # [NOVO] Augmentação de Request (req.user, req.sb)
│   │   └── agent.ts       # [NOVO] Tipos do agente (FunctionExecutor, BlockRecord)
│   ├── index.ts           # MIGRAR de index.js
│   ├── lib/
│   │   ├── supabase.ts    # MIGRAR de supabase.js
│   │   ├── sseClient.ts   # MIGRAR de sseClient.js (SSE crítico)
│   │   ├── uazapi.ts      # MIGRAR de uazapi.js
│   │   ├── whatsapp.ts    # MIGRAR de whatsapp.js
│   │   └── openai.ts      # MIGRAR de openai.js
│   ├── middleware/
│   │   └── auth.ts        # MIGRAR de auth.js
│   ├── routes/
│   │   ├── ai.ts          # MIGRAR
│   │   ├── auth.ts        # MIGRAR
│   │   ├── config.ts      # MIGRAR
│   │   ├── team.ts        # MIGRAR
│   │   ├── uazapi.ts      # MIGRAR
│   │   └── webhook.ts     # MIGRAR
│   ├── services/
│   │   └── morning-summary.ts  # MIGRAR
│   └── agent/
│       ├── executor.ts    # MIGRAR (arquivo mais crítico — 1371 linhas)
│       ├── functions.ts   # MIGRAR
│       └── openai.ts      # MIGRAR
```

**Structure Decision**: Migração in-place. Cada `.js` será convertido para `.ts` preservando o mesmo path. O TypeScript compila para `dist/` e o PM2 aponta para `dist/index.js`.

## Data Model

### Interfaces Supabase (derivadas de `conversaia.md` + `database/schema.sql`)

```typescript
// server/src/types/supabase.ts

export type UserRole = 'admin' | 'collaborator';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 1 | 2 | 3 | 4;

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  theme_color: string | null;
  avatar_url: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;       // 'YYYY-MM-DD' — nunca Date object
  due_time: string | null;       // 'HH:MM'
  project_id: string | null;
  section_id: string | null;
  parent_id: string | null;
  creator_id: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  owner_id: string;
  color: string | null;
  theme_color: string | null;
  description: string | null;
}

export interface Section {
  id: string;
  title: string;
  project_id: string;
  position: number;
}

export interface Assignment {
  task_id: string;
  user_id: string;
}

export interface Label {
  id: string;
  name: string;
  owner_id: string;
  color: string | null;
}
```

### Tipos do Agente

```typescript
// server/src/types/agent.ts

export interface BlockRecord {
  userId: string;
  until: Date;
  reason: string;
}

export interface FunctionExecutor {
  fn: (args: Record<string, unknown> & { phoneNumber: string }) => Promise<unknown>;
  needsPhone: boolean;
}

export interface AgentFunctionMap {
  [key: string]: FunctionExecutor;
}
```

### Augmentação do Express Request

```typescript
// server/src/types/express.d.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sb?: SupabaseClient;
    }
  }
}
```

## Build Flow (PM2 → Código Compilado)

```
1. npm run build   →  tsc (compila server/src/ → server/dist/)
2. PM2 ecosystem.config.js  →  script: "dist/index.js"
3. npm run dev:ts  →  ts-node-esm src/index.ts (desenvolvimento)
```

**tsconfig.json estratégico**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "allowJs": true,           // Migração progressiva
    "noImplicitAny": true,     // Força tipagem explícita
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| `allowJs: true` | Migração progressiva sem downtime | Migrar tudo de uma vez quebraria produção |
| `unknown` em alguns args do agente | Parâmetros da IA são dinâmicos (JSON.parse) | `any` viola Princípio VII; `unknown` + type guard é o correto |
