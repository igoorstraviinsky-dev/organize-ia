# Feature Specification: Infrastructure & Setup Wizard

**Feature Branch**: `005-infra-setup-wizard`  
**Created**: 2026-03-14  
**Status**: Draft  
**Input**: User description: "Aprimorar o script vps_update.sh para incluir um Setup Wizard interativo que garanta a integridade do arquivo .env e a correta injeção de variáveis nos containers."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configuração Inicial Automatizada (Priority: P1)

Como um administrador de infraestrutura, eu quero que o script de update detecte a ausência de chaves essenciais e me guie em uma configuração interativa, para que eu não suba o sistema quebrado.

**Why this priority**: É a base da Integridade de Ambiente (Princípio XI da Constituição). Sem chaves válidas, o sistema é inútil.

**Independent Test**: Deletar o arquivo `.env`, rodar `vps_update.sh` e verificar se o wizard é lançado automaticamente.

**Acceptance Scenarios**:

1. **Given** arquivo `.env` inexistente, **When** executo `bash vps_update.sh`, **Then** o script solicita `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.
2. **Given** o wizard aberto, **When** tento deixar um campo obrigatório vazio, **Then** o script exibe um erro e solicita novamente.

---

### User Story 2 - Build-Time Injection (Priority: P1)

Como desenvolvedor, eu quero que todas as variáveis `VITE_` sejam injetadas no momento do build do Docker, para que o bundle estático do frontend funcione corretamente em qualquer IP/Domínio sem erros de `undefined`.

**Why this priority**: Garante a conformidade com o Princípio XII da Constituição e resolve o bug recorrente de variáveis ausentes na SPA.

**Independent Test**: Rodar `docker compose build client` passando ARGs e verificar se os valores aparecem no bundle gerado.

**Acceptance Scenarios**:

1. **Given** chaves no `.env` da raiz, **When** executo o build via docker-compose, **Then** o `client/Dockerfile` recebe as chaves como `ARG` e as exporta como `ENV` para o Vite.

---

### Edge Cases

- **.env incompleto**: Se o arquivo existir mas faltar uma chave crítica, o wizard deve perguntar apenas a chave faltante ou permitir revisar.
- **Caracteres Especiais**: O script deve lidar corretamente com caracteres especiais (`&`, `$`, `*`) nas chaves sem quebrar a sintaxe do shell.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O script MUST validar a presença de: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`, `UAZAPI_URL`, `UAZAPI_TOKEN`, `UAZAPI_INSTANCE`.
- **FR-002**: O Setup Wizard MUST ser lançado se qualquer uma das chaves acima for nula ou vazia.
- **FR-003**: O script MUST persistir as alterações no arquivo `.env` da raiz e garantir que este seja o `env_file` único para os containers.
- **FR-004**: O `client/Dockerfile` MUST declarar `ARG VITE_API_URL`, `ARG VITE_SUPABASE_URL` e `ARG VITE_SUPABASE_ANON_KEY` antes de executar `npm run build`.

### Key Entities *(include if feature involves data)*

- **.env (Core Config)**: Arquivo fonte de verdade absoluta localizado na raiz do projeto.
- **Build Arguments (Vite)**: Tokens temporários usados durante o `npm run build` para substituir variáveis estáticas no código JS.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O sistema impede o boot se chaves críticas estiverem ausentes (Fail-fast).
- **SC-002**: O tempo para configurar uma nova VPS do zero (sem chaves prévias) cai de manual para < 2 minutos via Wizard.
- **SC-003**: Erros de `Uncaught Error: Missing environment variables` no console do navegador chegam a 0.
