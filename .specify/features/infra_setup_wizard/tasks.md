# Tasks: Infrastructure & Setup Wizard

**Input**: Design documents from `.specify/features/infra_setup_wizard/`
**Prerequisites**: plan.md, spec.md

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Preparar o ambiente para validação de integridade.

- [ ] T001 [P] Criar backup do `vps_update.sh` atual antes de iniciar as mudanças.
- [ ] T002 Validar a estrutura de diretórios do `.specify` para garantir que os arquivos seguem a nova Constituição.

## Phase 2: User Story 1 - Setup Wizard Interativo (Priority: P1) 🎯 MVP

**Goal**: Garantir que o sistema possua todas as chaves antes de tentar subir os containers.

**Independent Test**: Deletar `.env` e rodar `bash vps_update.sh`.

### Implementation for User Story 1

- [ ] T003 [US1] Adicionar função `check_env_integrity()` ao `vps_update.sh` para detectar chaves vazias ou ausentes.
- [ ] T004 [US1] Implementar o looping interativo do Setup Wizard solicitando chaves obrigatórias.
- [ ] T005 [US1] Adicionar validação de formato básico (ex: `VITE_SUPABASE_URL` deve começar com `https://`).
- [ ] T006 [US1] Garantir que o Wizard persista as chaves no formato correto no arquivo `.env`.

---

## Phase 3: User Story 2 - Build-Time Injection (Priority: P1)

**Goal**: Eliminar o erro de `undefined` no frontend injetando variáveis no estágio de compilação.

**Independent Test**: Executar `docker compose build client` e inspecionar o bundle JS gerado.

### Implementation for User Story 2

- [ ] T007 [US2] Atualizar `client/Dockerfile` para declarar `ARG` e `ENV` para `VITE_API_URL`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- [ ] T008 [US2] Atualizar `docker-compose.yml` na seção `client` para mapear as chaves do `.env` para os `args` de build.
- [ ] T009 [US2] Configurar `env_file: [.env]` nos serviços `server` e `agent` do `docker-compose.yml`.

---

## Phase 4: Polish & Security

- [ ] T010 [P] Adicionar aviso visual (ASCII Art) no `vps_update.sh` sinalizando que o sistema está em modo "Env Integrity".
- [ ] T011 Otimização: Garantir que o `vps_update.sh` não substitua chaves que já estão corretas, permitindo apenas "pular" (Enter) campos preenchidos.
- [ ] T012 Validar o arquivo unificado `.env` contra o `docker-compose.yml` final.

## Dependencies & Execution Order

1. **Foundational (Phase 1)**: Início imediato.
2. **Setup Wizard (Phase 2)**: Pode ser implementado em paralelo com a fase 3.
3. **Build-Time (Phase 3)**: Crítico para o funcionamento da SPA.
4. **Polish (Phase 4)**: Após validação funcional.
