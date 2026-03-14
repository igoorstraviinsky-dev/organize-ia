# Implementation Plan: Inteligência e Escala (Fase 4 - V2)

**Branch**: `004-intelligence-scale` | **Date**: 2026-03-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-intelligence-scale/spec.md`

## Summary

Esta fase consolida o Organizador como uma plataforma B2B escalável. O foco está na estabilidade e na observabilidade. O deploy será migrado para o modelo **Zero-Build** via **GHCR**, eliminando falhas de build local. O Agente Python será refatorado para ser **Multi-Tenant**, injetando o contexto do cliente em todas as ferramentas de IA, e o script `vps_update.sh` se tornará o painel oficial de monitoramento de logs.

## Technical Context

**Language/Version**: Python 3.10+, Node.js 20+, Docker Compose, GitHub Actions
**Primary Dependencies**: `docker-build-push`, `ghcr.io`, `Express (SSE Audit)`, `Pydantic (Agent Context)`
**Storage**: Supabase (PostgreSQL + RLS + Blindagem Manual Python)
**Target Platform**: Linux VPS (Ubuntu)

## Constitution Check (Version 3.1.0)

1. **Princípio IX (Zero-Build Implementation)**: Build no GHCR, pull na VPS. (MANDATÓRIO)
2. **Princípio X (Unified Observability)**: Monitoramento unificado implementado no console. (MANDATÓRIO)
3. **Princípio VII (Tenant Injection)**: Toda ferramenta Python deve receber `tenant_id`. (MANDATÓRIO)

## Project Structure

### Documentation

```text
specs/004-intelligence-scale/
├── plan.md              # This file
├── research.md          # 
├── data-model.md        # Definindo a extração de Tenant
└── tasks.md             # 
```

## Source Code Allocation

- `.github/workflows/deploy.yml`: Refatoração total para build+push GHCR.
- `docker-compose.yml`: Modificar `image` para apontar ao GHCR e configurar redes de monitoramento.
- `vps_update.sh`: Integração do comando `docker compose logs -f`.
- `agent/main.py`: Middleware de extração de Tenant para ferramentas da IA.
- `agent/db.py`: Refatoração CRUD com filtro mandatório de `tenant_id`.

## Implementation Strategy

### Step 1: Estabilização de Infra (Zero-Build + Context Fix)

- **Correção definitiva**: Mover `ecosystem.config.js` para `./server` ou mudar o build context do Docker Compose para `.` e ajustar os caminhos.
- **GHCR Pipeline**: Configurar o GitHub Actions para versionar as imagens no registro (`ghcr.io/seu-user/organize-server:latest`, etc).
- **Z-Deploy**: Modificar o script de deploy na VPS para realizar um `docker compose pull` antes do `up`.

### Step 2: Painel de Monitoramento (vps_update.sh)

- Adicionar a opção `[3] MONITORAR (Logs em tempo real)` no menu.
- Comandar `docker compose logs -f --tail 100` com suporte a interrupção graceful (`Ctrl+C`).

### Step 3: Arquitetura Multi-Tenant (Python Agent)

- **Middleware de Contexto**: Refatorar o roteamento de webhooks para identificar qual `tenant_id` pertence a cada instância no banco.
- **Function/Tools Refactoring**: Modificar o `agent.py` para que o roteamento de ferramentas da OpenAI receba e repasse o `tenant_id` para as funções em `db.py`.
- **Blindagem**: Validar que toda query SQL direta do agente usa o tenant injetado.

## Complexity Tracking

| Violation | Why Needed | 
|-----------|------------|
| N/A | Total alinhamento com a Constituição V3.1.0 |
