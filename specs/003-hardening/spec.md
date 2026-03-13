# Feature Specification: Server, Agent & Infra Evolution (Phases 1-3)

**Feature Branch**: `003-hardening`  
**Created**: 2026-03-13  
**Status**: Draft  
**Input**: Neutralizar a dívida técnica de infraestrutura e estabilizar a comunicação em tempo real. Estabelecer Docker como padrão, GitHub Actions como único gatekeeper e refatorar SSE com heartbeat e reconexão.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Isolamento Total de Dados B2B (Priority: P1)
Como um administrador de cliente B2B, eu quero ter a garantia absoluta de que meus dados estão isolados e inacessíveis para outros clientes.
**Acceptance Scenarios**:
1. Bloqueio preventivo via interface de 'User Blindagem' se `tenant_id` estiver ausente ou incorreto.

---

### User Story 2 - Estabilidade do Live Mode (SSE) (Priority: P1)
Como um usuário operacional, eu quero ver as atualizações de preços de metais e tarefas em tempo real sem interrupções.
**Acceptance Scenarios**:
1. Implementação de **Heartbeat** (ping a cada 30s) para manter a conexão ativa.
2. Reconexão automática imediata em caso de queda de rede, sem refresh manual.

---

### User Story 3 - Auditoria Geografia e Precificação (Priority: P2)
Como um auditor do sistema, eu quero que cada ação importante registre a geolocalização do autor.

---

### User Story 4 - Infraestrutura Imutável (Docker) (Priority: P1)
Como um desenvolvedor, eu quero que o ambiente de execução seja idêntico em desenvolvimento e produção, garantindo que o sistema funcione perfeitamente via containers.
**Why this priority**: Elimina o problema "funciona na minha máquina" e facilita o scale-up.
**Independent Test**: Subir todo o sistema com um único comando `docker-compose up --build` e validar as comunicações entre serviços internos.

---

### User Story 5 - Automação de Deploy (CI/CD) (Priority: P1)
Como um gestor de produto, eu quero que cada mudança validada no GitHub seja entregue automaticamente na produção sem intervenção manual.
**Why this priority**: Reduz erro humano e acelera o ciclo de entrega.
**Independent Test**: Commitar uma mudança na branch `main` e observar o GitHub Actions realizar o build Docker e o deploy na VPS.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Migração integral do Server para TypeScript 5.x (Strict Mode).
- **FR-002**: Tipagem estrita no Agente Python (Pydantic).
- **FR-003**: Implementar mecanismo de **Heartbeat** no roteamento SSE (Server -> Client).
- **FR-004**: Implementar lógica de **Reconexão Exponencial** no frontend para eventos SSE.
- **FR-005**: Criar **Dockerfiles** otimizados para: `server/`, `client/` e `agent/`.
- **FR-006**: Criar `docker-compose.yml` para orquestração local e de produção.
- **FR-007**: Configurar **GitHub Actions** para:
    - Linting e Type-check automático.
    - Build de imagens Docker.
    - Deploy automatizado via SSH/Docker Context.

### Key Entities *(include if feature involves data)*

- **DockerContainer**: Unidade imutável de execução.
- **SSEHeartbeat**: Payload de controle para manutenção de conexão.
- **WorkflowGate**: Regras de aprovação e deploy automatizado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 (zero) arquivos `.js` restantes no servidor.
- **SC-002**: 100% dos deploys realizados via GitHub Actions (depreciação total do `vps_update.sh`).
- **SC-003**: Tempo de reconexão SSE médio < 2 segundos após queda de micro-conexão.
- **SC-004**: Ambiente local sobe em < 5 minutos via Docker Compose a partir de um repositório limpo.
- **SC-005**: 0% de interrupções de 'loading loops' no dashboard operacional devido à falta de heartbeat.
