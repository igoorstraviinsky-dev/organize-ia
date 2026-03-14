# Tasks: Inteligência e Escala (Fase 4 - V2)

**Input**: Design documents from `/specs/004-intelligence-scale/`
**Prerequisites**: plan.md (required), spec.md (required)

## Phase 1: Infraestrutura e CI/CD (Zero-Build Standard)

- [ ] T001: Mover `ecosystem.config.js` para a subpasta `server/` para que ele seja acessível pelo build context atual.
- [ ] T002: Atualizar o arquivo `.github/workflows/deploy.yml` para realizar build+push para o GHCR (GitHub Container Registry).
- [ ] T003: Modificar `docker-compose.yml` para utilizar as imagens do GHCR (`image: ghcr.io/...`) em vez de build local em produção.
- [ ] T004: Atualizar o script de deploy no GitHub Actions para realizar `docker compose pull` antes de `up` na VPS.
- [ ] T005: Validar o novo fluxo de deploy imutável (Sem build na VPS).

## Phase 2: Monitoramento em Tempo Real (Painel de Controle)

- [ ] T006: Adicionar a funcionalidade `action_monitor_logs` no script `vps_update.sh` (opção [3] no menu).
- [ ] T007: Implementar o comando `docker compose logs -f --tail 100` com suporte ao `Ctrl+C` para retornar ao menu com segurança.
- [ ] T008: Testar a visibilidade colorida de logs (server, client, agent) simultaneamente no console.

## Phase 3: Agente Python Multi-Tenant (B2B Blindagem)

- [ ] T009: Criar classe `TenantContext` no Agente Python (Pydantic) para isolamento do cliente.
- [ ] T010: Refatorar `agent/main.py` para descobrir o `tenant_id` dinamicamente ao receber um webhook de qualquer instância WhatsApp.
- [ ] T011: Modificar `agent/agent.py` para injetar o `tenant_id` em todas as `TOOLS` (OpenAI Functions/MCP).
- [ ] T012: [P] [Urgente] Refatorar todas as queries em `agent/db.py` para exigir e filtrar obrigatoriamente por `tenant_id`.
- [ ] T013: Garantir que logs de auditoria e geolocalização do Agente registrem o `tenant_id` correto.

## Phase 4: Validação, Escala e Depreciação

- [ ] T014: Simular dois clientes B2B (Múltiplas instâncias WhatsApp) e validar o isolamento total de dados.
- [ ] T015: Atualizar o README com as instruções para o novo fluxo de deploy e monitoramento.
- [ ] T016: Marcar oficialmente o `vps_update.sh` como **Ferramenta de Operação/Monitoramento** (não mais script de deploy manual).

## Dependencies & Execution Order

1. **Phase 1**: Deve ser o primeiro passo para resolver o erro de build atual e estabilizar as próximas entregas.
2. **Phase 2**: Entrega rápida de valor operacional (monitoramento).
3. **Phase 3**: Core da Inteligência B2B.
4. **Phase 4**: Conclusão total.
