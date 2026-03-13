# Tasks: Server, Agent & Infra Evolution (Phases 1-3)

**Input**: Design documents from `/specs/003-hardening/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)
- [ ] T001 Initialize server TypeScript configuration (`server/tsconfig.json`) with `strict: true`
- [ ] T002 Update `server/package.json` with build scripts
- [ ] T003 [P] Configure Python types (Pydantic) for `agent/` hardening

## Phase 2: Foundational (Blocking Prerequisites)
- [ ] T004 Implement `TenantContext` e interfaces de blindagem em `server/src/types/index.ts`
- [ ] T005 Implement `withTenant` wrapper para Supabase em `server/src/utils/supabase.ts`
- [ ] T006 [P] Definir `SSEEvent` union e incluir suporte a `type: 'heartbeat'`

## Phase 3: User Story 1 - Isolamento Total de Dados B2B (Priority: P1)
- [ ] T007 [P] [US1] Migrar `auth.ts` e aplicar `AuthUser` com `tenant_id`
- [ ] T008 [US1] Migrar `config.ts` e aplicar padrão Data Gate
- [ ] T009 [US1] Refatorar chamadas ao Supabase usando `withTenant`

## Phase 4: User Story 2 - Estabilidade do Live Mode (SSE) (Priority: P1)
- [ ] T010 [US2] Implementar `SSEDispatcher.ts` com loop de **Heartbeat** (30s)
- [ ] T011 [US2] Adicionar lógica de reconexão exponencial no `client/src/hooks/useSSE.ts`
- [ ] T012 [P] [US2] Sincronizar tipos de eventos entre Server e Client

## Phase 5: User Story 3 - Auditoria Geografia e Precificação (Priority: P2)
- [ ] T013 [US3] Implementar `geoAuditMiddleware.ts`
- [ ] T014 [US3] Integrar auditoria nas rotas de Metal e Tasks
- [ ] T015 [P] [US3] Tipar entidade `MetalPrice`

## Phase 6: User Story 4 - Infraestrutura Imutável (Docker) (Priority: P1)
- [ ] T016 [US4] Criar `server/Dockerfile` (multi-stage: build -> run)
- [ ] T017 [US4] Criar `client/Dockerfile` (build static -> serve)
- [ ] T018 [US4] Criar `agent/Dockerfile` (Python slim)
- [ ] T019 [US4] Criar `docker-compose.yml` unificando os 3 serviços e rede interna

## Phase 7: User Story 5 - Automação de Deploy (CI/CD) (Priority: P1)
- [ ] T020 [US5] Criar `.github/workflows/deploy.yml` com pipeline de Check e Build
- [ ] T021 [US5] Implementar step de deploy via SSH e Docker Context no GitHub Actions
- [ ] T022 [US5] Validar deploy automático em ambiente de teste/staging

## Phase 8: Polish & Cross-Cutting Concerns
- [ ] T023 Migrar todos os `.js` restantes para `.ts` (Server/Agent)
- [ ] T024 [P] Validar logs de auditoria e fluxos SSE no dashboard final
- [ ] T025 **Limpeza**: Remover `vps_update.sh`, `iniciar_tudo.bat` e referências a deploy manual
- [ ] T026 Documentar o novo fluxo de deploy em `README.md`

## Dependencies & Execution Order
1. **Phases 1-2**: Setup & Foundation
2. **Phases 3-5**: Features (TS, SSE, Audit)
3. **Phase 6**: Dockerization (Prerequisite for CI/CD)
4. **Phase 7**: CI/CD (GitHub Actions)
5. **Phase 8**: Final Cleanup
