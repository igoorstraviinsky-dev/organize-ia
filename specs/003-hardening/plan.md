# Implementation Plan: Server, Agent & Infra Evolution (Phases 1-3)

**Branch**: `003-hardening` | **Date**: 2026-03-13 | **Spec**: [spec.md](spec.md)

## Summary
Migração para TypeScript (Strict Mode), isolamento B2B, estabilização de SSE com heartbeat e containerização total via Docker. O objetivo final é automatizar o ciclo de vida da aplicação via GitHub Actions, eliminando processos manuais.

## Technical Context

**Language/Version**: Node.js 20+, TypeScript 5.4, Python 3.10+, Docker, GitHub Actions
**Primary Dependencies**: Express, @supabase/supabase-js, docker-compose, pm2 (inside container)
**Storage**: Supabase (PostgreSQL + RLS)
**Target Platform**: Linux VPS (Ubuntu) running Docker.
**CI/CD**: GitHub Actions (Workflow gatekeeper).

## Constitution Check (Version 3.0.0)

1. **Princípio VII (Strict First)**: 100% TS e `strict: true`. (PASSED)
2. **Blindagem B2B**: Interfaces obrigatórias de `tenant_id`. (PASSED)
3. **Resilience (SSE)**: Heartbeat e reconexão automática. (PASSED)
4. **Princípio IX (Docker First)**: Docker como padrão imutável. (PASSED)

## Project Structure

### Documentation (this feature)

```text
specs/003-hardening/
├── plan.md              
├── research.md          
├── data-model.md        
├── contracts/           
│   └── sse-contract.md
└── tasks.md             
```

### Source Code Allocation
- `docker-compose.yml`: Orquestração global.
- `server/Dockerfile`: Multi-stage build para a API Node/TS.
- `client/Dockerfile`: Build do frontend e serve via Nginx (ou similar).
- `agent/Dockerfile`: Ambiente Python isolado para agentes.
- `.github/workflows/deploy.yml`: Automação CI/CD.

## Implementation Strategy

### Step 1: Server Hardening & SSE Heartbeat
- Concluir migração TS e modo estrito.
- Implementar `setInterval` no `SSEDispatcher` para enviar `type: 'heartbeat'` a cada 30s.
- Adicionar listener de erro no `sseClient` do frontend para disparar reconexão exponencial.

### Step 2: Containerização (Docker)
- Criar `Dockerfiles` específicos para cada serviço.
- Migrar segredos (`.env`) para variáveis de ambiente gerenciadas pelo Docker Compose.
- Testar orquestração local `server <-> agent`.

### Step 3: CI/CD & Depreciação
- Configurar Workflow do GitHub para disparar no push da `main`.
- Validar deploy automático na VPS via Docker.
- **Limpeza**: Remover `vps_update.sh` e `iniciar_tudo.bat` após sucesso validado.
