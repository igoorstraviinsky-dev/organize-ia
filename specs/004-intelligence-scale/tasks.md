# Tasks: Inteligência e Escala (Fase 4)

**Input**: Design documents from `/specs/004-intelligence-scale/`
**Prerequisites**: plan.md (required), spec.md (required)

## Phase 1: Infraestrutura e CI/CD (Estabilização)

- [ ] T001: Corrigir o build context em `docker-compose.yml` para a raiz e atualizar `server/Dockerfile` para acessar o `ecosystem.config.js`.
- [ ] T002: Atualizar `.github/workflows/deploy.yml` para usar o contexto de build correto e incluir validações do `client` e `agent`.
- [ ] T003: Implementar login no GHCR via `docker/login-action` e configurar o envio das imagens via `docker/build-push-action`.
- [ ] T004: Atualizar o job de deploy no GitHub Actions para realizar `docker compose pull` antes de `up`, aproveitando as imagens do registro.
- [ ] T005: Configurar segredos necessários (secretas do repo) se houver gaps detectados.

## Phase 2: Agente Python Multi-Tenant (Blindagem B2B)

- [ ] T006: Criar a classe `TenantContext` no `agent/types.py` (ou `models.py`) para encapsular o isolamento do cliente.
- [ ] T007: Refatorar `agent/main.py` para buscar configurações de instância dinamicamente no Supabase ao receber um webhook (usando token ou nome).
- [ ] T008: Injetar o `tenant_id` no ciclo de vida do agente e atualizar a função `process_message` para aceitar esse contexto.
- [ ] T009: [P] Refatorar todas as queries em `agent/db.py` para incluírem o filtro obrigatório por `tenant_id` (Blindagem).
- [ ] T010: Atualizar o `system_prompt` para lidar com múltiplas instâncias e contextos específicos do cliente.

## Phase 3: Validação, Escala e Depreciação

- [ ] T011: Validar o fluxo de deploy "zero-build" na VPS (puxando imagens do GHCR).
- [ ] T012: Testar a simultaneidade de mensagens de dois tenants diferentes (Isolamento de Dados).
- [ ] T013: Marcar o `vps_update.sh` como **DEPRECATED** no cabeçalho e instruir o usuário no README.
- [ ] T014: Atualizar `Walkthrough` final da Fase 4 documentando a nova capacidade B2B.

## Dependencies & Execution Order

1. **Phase 1**: Deve ser feita primeiro para permitir que as iterações nas fases 2 e 3 sejam testadas já no novo pipeline.
2. **Phase 2**: Core da inteligência B2B.
3. **Phase 3**: Conclusão e formalização.
