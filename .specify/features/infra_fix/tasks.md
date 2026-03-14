# Tarefas de Infraestrutura Imutável

## Fase 1: Core de Ambiente
- [x] T01: Refatorar `vps_update.sh` com Novo Setup Wizard.
- [x] T02: Implementar busca insensível a caso no `sseClient.ts`.
- [x] T03: Ajustar URL SSE para conformidade UazapiGO V2.

## Fase 2: Docker & Build
- [x] T04: Adicionar injeção de `ARG` no `client/Dockerfile`.
- [x] T05: Mapear `args` de build no `docker-compose.yml`.
- [x] T06: Criar `.dockerignore` global para segurança de chaves.

## Fase 3: Conectividade
- [x] T07: Validar `BRAIN_URL` no container Agente.
- [w] T08: Executar deploy final e validação via logs.
