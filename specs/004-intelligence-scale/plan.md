# Implementation Plan: Inteligência e Escala (Fase 4)

**Branch**: `004-intelligence-scale` | **Date**: 2026-03-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-intelligence-scale/spec.md`

## Summary

Esta fase estabiliza o ciclo de vida da aplicação (deploy imutável) e prepara o Agente Python para crescimento B2B. O ponto crítico é a correção dos contextos de build do Docker para que o `ecosystem.config.js` (na raiz) seja acessível e a transição do deploy para o GitHub Container Registry (GHCR). No código, o Agente Python será refatorado para garantir que toda operação de banco de dados seja filtrada pelo `tenant_id` da instância de origem (Blindagem B2B).

## Technical Context

**Language/Version**: Python 3.10+, Node.js 20+, Docker, GitHub Actions
**Primary Dependencies**: Docker Buildx, `ghcr.io`, `httpx` (Python), `pydantic` (Python)
**Storage**: Supabase (PostgreSQL + RLS)
**Target Platform**: GitHub Actions CI/CD -> Ubuntu VPS (via SSH)
**CI/CD**: GitHub Actions (GHCR Integration)

## Constitution Check (Version 3.0.0)

1. **Princípio VII (Blindagem B2B)**: Agente Python filtrará consultas por `tenant_id`. (MANDATÓRIO)
2. **Princípio IX (CI/CD Gatekeeper)**: Toda imagem deve vir do registro (GHCR); deploy na VPS restrito ao GitHub Actions. (MANDATÓRIO)

## Project Structure

### Documentation

```text
specs/004-intelligence-scale/
├── plan.md              # This file
├── research.md          # (Opcional - se houver novos fluxos complexos)
├── data-model.md        # Definição do TenantContext
└── tasks.md             # Lista de tarefas
```

## Source Code Allocation

- `.github/workflows/deploy.yml`: Atualização total para usar GHCR.
- `docker-compose.yml`: Modificação para puxar imagens do registro em produção.
- `agent/main.py`: Roteamento multi-instância e injeção de contexto.
- `agent/db.py`: Refatoração das funções CRUD para exigir `tenant_id`.

## Implementation Strategy

### Step 1: Estabilização da Infraestrutura (Deploy)

- **Correção de contexto**: Ajustar builds para que o contexto seja a raiz (`.`) e não a subpasta, permitindo o `COPY ecosystem.config.js`.
- **GHCR Pipeline**: Adicionar steps de login e push para cada imagem (server, client, agent).
- **Zero-Build Deploy**: A VPS apenas executará `docker compose pull` e `up`, eliminando falhas de build no servidor de destino.

### Step 2: Blindagem B2B no Agente Python

- **TenantContext**: Criar classe Pydantic para carregar dados do tenant.
- **Webhook Routing**: Mudar de "instância default" para uma busca dinâmica no Supabase baseada no token recebido.
- **Injeção de Tenant**: Todas as ferramentas do `agent.py` devem receber o `tenant_id` do cabeçalho da requisição ou do webhook.

### Step 3: Validação e Depreciação

- Realizar deploy "puro" via GitHub Actions.
- Validar logs com múltiplos tenants.
- **Limpeza**: Adicionar aviso de DEPRECATED no `vps_update.sh`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | Total alinhamento com a Constituição V3 | N/A |
