# Clarification Analysis: TypeScript Migration Phase 1

**Feature Branch**: `002-ts-migration-phase-1`
**Date**: 2026-03-13
**Status**: ✅ Sem bloqueadores — pronto para geração de tasks

## Áreas Analisadas

### 1. Lógica de Bloqueio Temporário (15 min)

**Análise**: Após revisar `executor.js` (1371 linhas) e `openai.js`, **não existe** uma implementação de "bloqueio temporário de 15 minutos" no código atual. O que existe é um **Security Guard** em `openai.js` (linha 74) que bloqueia permanentemente telefones não cadastrados, retornando uma mensagem de erro.

**Conclusão**: O tipo `BlockRecord` no plano é uma **preparação proativa** para uma feature futura mencionada pelo usuário, não algo já implementado. Para a Fase 1, o tipo `BlockRecord` será definido como interface mas não haverá lógica a tipar imediatamente.

**Tipo Recomendado** (simples, sem complexidade adicional):
```typescript
interface BlockRecord {
  userId: string;
  until: Date;        // Timestamp de expiração
  reason: string;
}
// Map<phoneNumber: string, BlockRecord>
const temporaryBlocks = new Map<string, BlockRecord>();
```

### 2. SSE Client - Pontos de Atenção para Tipagem

**Análise**: `sseClient.js` (597 linhas) — arquivo mais complexo para tipagem.

**Áreas sensíveis identificadas**:
- `activeConnections: Map<string, SSEHandle>` — o `handle` tem `close: () => void`, `connected: boolean`, `path: string | null`
- `parseWebhookPayload(data)` retorna `ParsedMessage | null` — tipo precisa ser definido
- Eventos SSE têm payload dinâmico (`data.event`, `data.type`, `data.EventType`) — usar `unknown` + type guard é a abordagem correta
- `downloadMediaBase64` usa um objeto de config com `log: (msg: string) => void` callback — precisa de interface

**Decisão**: Nenhuma complexidade adicional. Os tipos serão definidos durante a migração, usando `unknown` onde o JSON externo é parseado.

### 3. Module System - ESM vs CommonJS

**Problema detectado**: O `server/package.json` usa `"type": "module"` (ESM). O TypeScript com `module: "NodeNext"` e `moduleResolution: "NodeNext"` requer extensões `.js` nos imports mesmo para arquivos `.ts`. **Isso é o comportamento correto e esperado** — ao migrar `executor.js` para `executor.ts`, os imports ficam como `import { ... } from './executor.js'` (TypeScript resolve para `.ts` em dev e `.js` no dist).

**Conclusão**: Não há bloqueador. O plano de tsconfig está correto.

### 4. executor.js — `any` implícito em props de destruturação

**Problema identificado**: Todas as funções exportadas do `executor.js` usam parâmetros com destruturação sem tipo:
```javascript
export async function createTask({ title, description, due_date, ... phoneNumber }) { ... }
```

**Solução**: Criar interfaces para os parâmetros de cada função:
```typescript
interface CreateTaskParams {
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  priority?: TaskPriority;
  project_name?: string;
  section_name?: string;
  parent_task_id?: string | null;
  labels?: string[];
  assigned_user_identifier?: string;
  phoneNumber: string;
}
```

Isso é trabalho volumoso (1371 linhas) mas mecânico — sem decisões de design complexas.

## Conclusão

✅ **Zero bloqueadores identificados** para prosseguir com a implementação.

Os únicos riscos são:
1. **Volume**: `executor.js` tem 1371 linhas → tarefa maior, mas mecânica
2. **ESM imports**: Manter extensões `.js` nos imports TypeScript (padrão NodeNext)
3. **PM2 deploy**: Lembrar de rodar `npm run build` antes de `pm2 restart`

Pronto para geração de tasks.
