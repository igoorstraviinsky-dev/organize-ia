# Feature Specification: Inteligência e Escala (Fase 4 - V2)

**Feature Branch**: `004-intelligence-scale`  
**Created**: 2026-03-14  
**Status**: Draft  
**Input**: Estabilizar deploy Zero-Build (GHCR), implementar monitoramento de logs unificado e Agente Python Multi-Tenant B2B.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deploy Zero-Build e Imutável (Priority: P1)

Como um gestor de infraestrutura, eu quero que o GitHub Actions realize o build e o push das imagens Docker para o registro (GHCR) e o deploy na VPS ocorra puxando essas imagens prontas.

**Why this priority**: Garante que o build ocorre em ambiente controlado e acelera o deploy na VPS, eliminando falhas de contexto local (como o erro do `ecosystem.config.js`).

**Independent Test**: Commitar uma mudança na branch `main`, observar o GitHub Actions publicar a imagem e a VPS atualizar usando `docker compose pull`.

---

### User Story 2 - Monitoramento Unificado (Logs) (Priority: P1)

Como um administrador do sistema, eu quero visualizar os logs de todos os containers simultaneamente em tempo real através do menu `vps_update.sh`.

**Why this priority**: Essencial para a saúde de uma operação B2B. Permite diagnosticar erros em qualquer camada (server, agent, client) de uma só vez.

**Independent Test**: Escolher a nova opção no menu do `vps_update.sh` e ver o fluxo de logs colorido de todos os serviços.

---

### User Story 3 - Agente Python Multi-Tenant B2B (Priority: P1)

Como um cliente B2B, eu quero que o Agente Python processe minhas mensagens de WhatsApp de forma isolada, garantindo que as ferramentas (tools) só acessem meus dados baseados na minha instância/tenant.

**Why this priority**: Inegociável para escala comercial. Garante que o Agente Diego só veja as tarefas do Diego e o Agente Jhonatas só veja as do Jhonatas.

**Independent Test**: Enviar mensagens para instâncias diferentes e validar a injeção do `tenant_id` no ciclo de vida da requisição no script Python.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Zero-Build)**: Configurar GitHub Actions para buildar imagens com Docker Buildx e fazer push para o GHCR.
- **FR-002 (Live Monitoring)**: Adicionar opção no `vps_update.sh` que execute `docker compose logs -f --tail 100`.
- **FR-003 (Tenant Scoping)**: O Agente Python deve possuir um middleware que busque o `tenant_id` no banco de dados a partir do identificador da instância do webhook.
- **FR-004 (Auditoria Python)**: Injetar `latitude`, `longitude` (se disponível) e `tenant_id` nos logs de interação do agente.
- **FR-005 (B2B Multi-flow)**: O `main.py` do Agente deve suportar roteamento para múltiplos endpoints da UazAPI dinamicamente.

### Key Entities 

- **TenantContext**: Carrega `tenant_id`, `is_active`, `config_whatsapp`.
- **LogStream**: Fluxo unificado de saída dos containers.

## Success Criteria 

### Measurable Outcomes

- **SC-001**: Tempo de deploy na VPS reduzido de ~5min (build local) para < 1min (pull de imagem).
- **SC-002**: 100% das ferramentas (tools) do Agente Python injetam `tenant_id` via parâmetro mandatório.
- **SC-003**: Acesso aos logs de todos os serviços via 1 único comando no menu.
- **SC-004**: Zero builds realizados diretamente na CPU da VPS em ambiente de produção.
