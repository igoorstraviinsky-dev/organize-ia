# Feature Specification: Inteligência e Escala (Fase 4)

**Feature Branch**: `004-intelligence-scale`  
**Created**: 2026-03-14  
**Status**: Draft  
**Input**: Estabilizar deploy automatizado via GitHub Actions e configurar Agente Python para múltiplos fluxos WhatsApp B2B com blindagem de tenant.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deploy Imutável e Automático (Priority: P1)

Como um gestor de infraestrutura, eu quero que o GitHub Actions realize o build e o push das imagens Docker para um registro (GHCR) e o deploy na VPS ocorra puxando essas imagens prontas.

**Why this priority**: Garante que o build ocorre em ambiente controlado e acelera o deploy na VPS, eliminando falhas de contexto local (como o erro do `ecosystem.config.js`).

**Independent Test**: Commitar uma mudança na branch `main`, observar o GitHub Actions publicar a imagem e a VPS atualizar usando `docker compose pull`.

**Acceptance Scenarios**:
1. **Given** um commit na branch `main`, **When** o workflow terminar, **Then** as imagens devem estar no GitHub Container Registry (GHCR).
2. **Given** o workflow concluído, **When** o script de deploy Rodar na VPS, **Then** os containers devem subir sem realizar builds locais demorados.

---

### User Story 2 - Agente Python Multi-Tenant B2B (Priority: P1)

Como um cliente B2B, eu quero que o Agente Python processe minhas mensagens de WhatsApp de forma isolada, garantindo que as ferramentas (tools) só acessem meus dados baseados na minha instância/tenant.

**Why this priority**: Essencial para a expansão comercial do produto (escala B2B). Sem blindagem de tenant, há risco de vazamento de dados entre clientes.

**Independent Test**: Enviar mensagens para duas instâncias de WhatsApp diferentes (Cliente A e Cliente B) e validar via logs que cada uma acessou apenas seu respectivo `tenant_id` no banco de dados.

**Acceptance Scenarios**:
1. **Given** um webhook da UazAPI com a instância 'cliente_a', **When** o agente processar, **Then** o `user_id` e o escopo de dados devem ser restritos ao `tenant_id` vinculado a essa instância.
2. **Given** uma tentativa de acesso a uma tarefa de outro tenant via Agente, **When** a ferramenta for executada, **Then** o sistema deve retornar "Não encontrado" (blindagem).

---

### User Story 3 - Publicação de Logs de Auditoria do Agente (Priority: P2)

Como um auditor, eu quero que cada interação do Agente Python registre o `tenant_id` e a origem (WhatsApp/Telegram) nos logs de auditoria do sistema.

**Why this priority**: Necessário para conformidade e debug em ambiente multi-cliente.

**Independent Test**: Verificar a tabela de auditoria após uma conversa com o agente e confirmar que o campo `tenant_id` está preenchido corretamente.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Corrigir contexto de build no `docker-compose.yml` e `deploy.yml` para a raiz do projeto (permitindo acesso ao `ecosystem.config.js` se necessário, ou consolidar arquivos).
- **FR-002**: Configurar GitHub Actions para autenticar no GHCR e realizar `docker push` das imagens `organize-server`, `organize-client` e `organize-agent`.
- **FR-003**: Implementar um `TenantMiddleware` no servidor Python para extrair e validar o contexto do cliente a partir do token/instância do webhook.
- **FR-004**: Refatorar `agent/db.py` para injetar obrigatoriamente o `tenant_id` em todas as consultas (Blindagem B2B).
- **FR-005**: Adicionar suporte a múltiplas instâncias da UazAPI no `agent/main.py`.
- **FR-006**: Criar mecanismo de retry para o deploy na VPS caso o `docker compose pull` falhe por rede.

### Key Entities *(include if feature involves data)*

- **TenantContext**: Objeto que carrega `tenant_id`, `config` e `permissions` durante o ciclo de vida de uma requisição no Agente Python.
- **DockerRegistryImage**: Artefato imutável versionado no GHCR.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tempo de deploy na VPS reduzido de ~5min (build local) para < 1min (pull de imagem).
- **SC-002**: 100% das chamadas de banco no Agente Python filtradas por `tenant_id`.
- **SC-003**: Zero erros de "file not found" durante o build no GitHub Actions.
- **SC-004**: Capacidade demonstrada de rodar 3 instâncias de WhatsApp diferentes simultaneamente no mesmo Agente Python.
