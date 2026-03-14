# Implementation Plan: Infrastructure & Setup Wizard

**Branch**: `005-infra-setup-wizard` | **Date**: 2026-03-14 | **Spec**: [.specify/features/infra_setup_wizard/spec.md]

## Summary

Implementação de um sistema de "Pre-flight Check" e "Interactive Setup Wizard" no script `vps_update.sh`. O objetivo é garantir que o sistema nunca suba sem as variáveis de ambiente necessárias, guiando o usuário na configuração interativa. Além disso, padronizamos a injeção de variáveis `VITE_` via Docker Build Arguments para garantir a integridade da SPA.

## Technical Context

**Language/Version**: Shell (Bash), Dockerfile, YAML  
**Primary Dependencies**: Docker, Docker Compose, Git  
**Storage**: `.env` (Source of truth)  
**Testing**: Shell script validation (if empty prompts)  
**Target Platform**: Ubuntu/Linux VPS  
**Project Type**: Infrastructure & Ops  

## Constitution Check

- **Princípio XI (Env Integrity)**: O script `vps_update.sh` deve implementar a lógica de interrupção se chaves estiverem vazias.
- **Princípio XII (Frontend Static Injection)**: O `client/Dockerfile` e `docker-compose.yml` devem ser atualizados para usar `args`.

## Project Structure

### Documentation (this feature)

```text
.specify/features/infra_setup_wizard/
├── spec.md              # Specification
├── plan.md              # This file
└── tasks.md             # Tasks list
```

### Source Code Impacted

```text
/
├── vps_update.sh        # Adição do Wizard e Validação
├── docker-compose.yml   # Adição de build args e env_file
├── client/
│   └── Dockerfile       # Adição de ARG e ENV build-time
├── server/
│   └── Dockerfile       # (Opcional) Verificação de ENV
└── agent/
    └── Dockerfile       # (Opcional) Verificação de ENV
```

## Implementation Phases

### Phase 1: Setup Wizard em Shell
- Criar a função `validate_env()` no `vps_update.sh`.
- Criar a função `run_setup_wizard()` que solicita variáveis via `read -p`.
- Garantir que valores nulos não sejam aceitos.
- Adicionar lógica para persistir no `.env` da raiz.

### Phase 2: Injeção Build-Time (Frontend)
- Modificar `client/Dockerfile` para aceitar `ARG VITE_API_URL`, `ARG VITE_SUPABASE_URL`, `ARG VITE_SUPABASE_ANON_KEY`.
- Modificar `docker-compose.yml` para passar essas variáveis da seção `args` do build do `client`.

### Phase 3: Unificação de Runtime (Backend)
- Configurar o `env_file` no `docker-compose.yml` para que `server` e `agent` leiam diretamente do `.env` da raiz, removendo redundâncias.

## Validation Strategy
- Deletar `.env` localmente na VPS de teste e rodar o script.
- Verificar se `docker inspect <client_container_id>` mostra as variáveis de build corretas.
- Verificar logs do servidor para `[Supabase] ... obrigatórios` (não deve ocorrer).
